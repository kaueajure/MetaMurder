import { Vector2D, PlayerRole, PlayerState, TaskDefinition } from '../shared/types';
import { TASK_DEFINITIONS, ROOMS, VENTS, EMERGENCY_BUTTON_POS, SABOTAGE_NODES } from '../shared/mapData';
import { GameEngine, GamePlayer } from './gameEngine';
import { sanitizeChatMessage } from './chatFilter';

async function generateGeminiBotChat(
  botName: string,
  botRole: 'CREWMATE' | 'IMPOSTOR',
  difficulty: string,
  reason: 'BODY' | 'EMERGENCY',
  reporterName: string,
  livingPlayers: string[],
  observedContext: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `Você é o bot de inteligência artificial chamado '${botName}' jogando uma partida de dedução social (estilo Among Us / MetaMurder).
Seu papel secreto é: ${botRole === 'IMPOSTOR' ? 'ASSASSINO (Impostor - tente parecer inocente ou acusar discretamente outros)' : 'TRIPULANTE (Inocente - ajude a descobrir o assassino)'}.
Dificuldade: ${difficulty}.
Evento da Reunião: ${reason === 'BODY' ? `Corpo denunciado por ${reporterName}` : 'Reunião de Emergência'}.
Jogadores Vivos: ${livingPlayers.join(', ')}.
Contexto Observado: ${observedContext}.

Responda com UMA ÚNICA MENSAGEM CURTA de chat de jogo em Português (máximo 15 palavras). Fale de maneira natural como um jogador real no chat. Não use aspas.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 60, temperature: 0.8 }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return reply || null;
  } catch (err) {
    return null;
  }
}


interface BotMemory {
  seenPlayers: Map<string, { x: number; y: number; room: string; time: number }>;
  seenBodies: string[];
  suspicionScores: Map<string, number>; // playerId -> 0..100
  myCurrentTaskIndex: number;
  taskTimer: number;
  moveTarget: Vector2D | null;
}

export class BotEngine {
  private gameEngine: GameEngine;
  private memories: Map<string, BotMemory> = new Map();

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
  }

  public initBot(botId: string): void {
    this.memories.set(botId, {
      seenPlayers: new Map(),
      seenBodies: [],
      suspicionScores: new Map(),
      myCurrentTaskIndex: 0,
      taskTimer: 0,
      moveTarget: null
    });
  }

  public tick(bot: GamePlayer, deltaTime: number): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;

    let memory = this.memories.get(bot.id);
    if (!memory) {
      this.initBot(bot.id);
      memory = this.memories.get(bot.id)!;
    }

    if (this.gameEngine.phase === 'MEETING') {
      return; // Meeting handled separately
    }

    if (this.gameEngine.phase !== 'PLAYING') return;

    // Scan nearby players & update memory
    this.updateVisionMemory(bot, memory);

    // Check for bodies nearby to report
    for (const body of this.gameEngine.bodies) {
      if (!body.reported && this.dist(bot, body) < 120) {
        if (!memory.seenBodies.includes(body.id)) {
          memory.seenBodies.push(body.id);
          // Impostor bots report 40% of the time, crewmates 100%
          if (bot.role === 'CREWMATE' || Math.random() < 0.4) {
            this.gameEngine.reportBody(bot.id, body.id);
            return;
          }
        }
      }
    }

    // Handle Active Critical Sabotages (Reactor / O2 / Lights)
    const activeSab = this.gameEngine.sabotage.activeType;
    if (activeSab && bot.role === 'CREWMATE') {
      if (activeSab === 'LIGHTS') {
        const target = SABOTAGE_NODES.LIGHTS_BREAKER;
        this.moveTowards(bot, target, deltaTime);
        if (this.dist(bot, target) < 60) {
          this.gameEngine.resolveSabotageNode(bot.id, 'LIGHTS_BREAKER');
        }
        return;
      } else if (activeSab === 'REACTOR') {
        const target = SABOTAGE_NODES.REACTOR_PAD_1;
        this.moveTowards(bot, target, deltaTime);
        if (this.dist(bot, target) < 60) {
          this.gameEngine.resolveSabotageNode(bot.id, 'REACTOR_PAD_1');
        }
        return;
      }
    }

    // Role-specific actions
    if (bot.role === 'CREWMATE') {
      this.tickCrewmateBot(bot, memory, deltaTime);
    } else {
      this.tickImpostorBot(bot, memory, deltaTime);
    }
  }

  private tickCrewmateBot(bot: GamePlayer, memory: BotMemory, deltaTime: number): void {
    if (bot.tasks.length === 0) return;

    const currentTask = bot.tasks[memory.myCurrentTaskIndex];

    if (!currentTask || currentTask.completed) {
      // Find next incomplete task
      const nextIndex = bot.tasks.findIndex(t => !t.completed);
      if (nextIndex !== -1) {
        memory.myCurrentTaskIndex = nextIndex;
      }
      return;
    }

    const targetPos = { x: currentTask.x, y: currentTask.y };
    const distance = this.dist(bot, targetPos);

    if (distance > 50) {
      this.moveTowards(bot, targetPos, deltaTime);
      memory.taskTimer = 0;
    } else {
      // Standing at task location
      bot.vx = 0;
      bot.vy = 0;
      memory.taskTimer += deltaTime;

      if (memory.taskTimer >= 4.0) { // 4 sec task duration
        this.gameEngine.completeTask(bot.id, currentTask.id);
        memory.taskTimer = 0;
        memory.myCurrentTaskIndex = (memory.myCurrentTaskIndex + 1) % bot.tasks.length;
      }
    }
  }

  private tickImpostorBot(bot: GamePlayer, memory: BotMemory, deltaTime: number): void {
    // 1. Look for isolated crewmate targets
    const killCooldown = bot.killCooldownRemaining;

    if (killCooldown <= 0) {
      const candidates = Array.from(this.gameEngine.players.values()).filter(p => 
        p.id !== bot.id && 
        p.state === 'ALIVE' && 
        p.role === 'CREWMATE' && 
        !p.inVent
      );

      for (const target of candidates) {
        const d = this.dist(bot, target);
        if (d < 90) {
          // Check if anyone else is witnessing
          const witnesses = candidates.filter(other => other.id !== target.id && this.dist(target, other) < 200);
          if (witnesses.length === 0) {
            this.gameEngine.killPlayer(bot.id, target.id);
            
            // 30% chance to vent after kill
            if (Math.random() < 0.3) {
              const nearestVent = VENTS.find(v => this.dist(bot, v) < 100);
              if (nearestVent) {
                this.gameEngine.useVent(bot.id, nearestVent.id);
              }
            }
            return;
          }
        }
      }
    }

    // 2. Trigger sabotages if available
    if (bot.sabotageCooldownRemaining <= 0 && Math.random() < 0.05) {
      const sabTypes: ('LIGHTS' | 'REACTOR' | 'O2')[] = ['LIGHTS', 'REACTOR', 'O2'];
      const chosen = sabTypes[Math.floor(Math.random() * sabTypes.length)];
      this.gameEngine.triggerSabotage(bot.id, chosen);
    }

    // 3. Move around map / fake tasks
    if (!memory.moveTarget || this.dist(bot, memory.moveTarget) < 40) {
      // Pick random room
      const randomRoom = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      memory.moveTarget = {
        x: randomRoom.x + randomRoom.width / 2 + (Math.random() * 100 - 50),
        y: randomRoom.y + randomRoom.height / 2 + (Math.random() * 100 - 50)
      };
    }

    this.moveTowards(bot, memory.moveTarget, deltaTime);
  }

  public handleMeetingDiscussion(bot: GamePlayer): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;

    const memory = this.memories.get(bot.id);
    const meeting = this.gameEngine.meetingState;
    if (!meeting) return;

    // Generate context chat after random delay (2-5s)
    setTimeout(async () => {
      if (this.gameEngine.phase !== 'MEETING') return;

      const livingPlayers = Array.from(this.gameEngine.players.values())
        .filter(p => p.state === 'ALIVE')
        .map(p => p.name);

      const seenList = memory ? Array.from(memory.seenPlayers.keys()) : [];
      const observedText = seenList.length > 0 ? `Viu os jogadores ${seenList.slice(0, 2).join(', ')} recentemente.` : 'Não viu nada de suspeito.';

      // Attempt Gemini AI generation
      let msg = await generateGeminiBotChat(
        bot.name,
        bot.role,
        this.gameEngine.settings.botDifficulty,
        meeting.reason,
        meeting.callerName,
        livingPlayers,
        observedText
      );

      // Fallback procedural messages if Gemini API is unavailable or fails
      if (!msg) {
        if (bot.role === 'CREWMATE') {
          if (meeting.reason === 'BODY') {
            msg = `Onde foi encontrado o corpo? Eu estava no Refeitório.`;
          } else {
            msg = `Quem estamos suspeitando galera?`;
          }
        } else { // Impostor bot
          const innocentPlayers = Array.from(this.gameEngine.players.values()).filter(p => p.state === 'ALIVE' && p.role === 'CREWMATE');
          if (innocentPlayers.length > 0) {
            const scapegoat = innocentPlayers[Math.floor(Math.random() * innocentPlayers.length)];
            msg = `Achei o ${scapegoat.name} meio suspeito, ele estava me seguindo.`;
          } else {
            msg = `Estava fazendo tarefas no Armazém.`;
          }
        }
      }

      this.gameEngine.sendChatMessage(bot.id, msg);
    }, Math.floor(Math.random() * 3000) + 2000);
  }


  public handleMeetingVoting(bot: GamePlayer): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;

    setTimeout(() => {
      if (this.gameEngine.phase !== 'MEETING') return;

      const livingPlayers = Array.from(this.gameEngine.players.values()).filter(p => p.state === 'ALIVE' && p.id !== bot.id);
      if (livingPlayers.length === 0) return;

      if (bot.role === 'IMPOSTOR') {
        // Vote for crewmates
        const crewCandidates = livingPlayers.filter(p => p.role === 'CREWMATE');
        const target = crewCandidates.length > 0 ? crewCandidates[Math.floor(Math.random() * crewCandidates.length)] : livingPlayers[0];
        this.gameEngine.castVote(bot.id, target.id);
      } else {
        // Crewmate vote (60% vote random living player, 40% skip)
        if (Math.random() < 0.6) {
          const target = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
          this.gameEngine.castVote(bot.id, target.id);
        } else {
          this.gameEngine.castVote(bot.id, 'SKIP');
        }
      }
    }, Math.floor(Math.random() * 5000) + 3000);
  }

  private moveTowards(bot: GamePlayer, target: Vector2D, deltaTime: number): void {
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      bot.vx = 0;
      bot.vy = 0;
      return;
    }

    const speed = 180 * this.gameEngine.settings.playerSpeed;
    bot.vx = (dx / dist) * speed;
    bot.vy = (dy / dist) * speed;
    bot.facing = dx < 0 ? 'LEFT' : 'RIGHT';

    bot.x += bot.vx * deltaTime;
    bot.y += bot.vy * deltaTime;
  }

  private updateVisionMemory(bot: GamePlayer, memory: BotMemory): void {
    for (const p of this.gameEngine.players.values()) {
      if (p.id !== bot.id && p.state === 'ALIVE' && !p.inVent) {
        if (this.dist(bot, p) < 250) {
          memory.seenPlayers.set(p.id, {
            x: p.x,
            y: p.y,
            room: 'UNKNOWN',
            time: Date.now()
          });
        }
      }
    }
  }

  private dist(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
