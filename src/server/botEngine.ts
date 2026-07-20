import { Vector2D, PlayerRole, PlayerState, TaskDefinition } from '../shared/types';
import { TASK_DEFINITIONS, ROOMS, VENTS, EMERGENCY_BUTTON_POS, SABOTAGE_NODES } from '../shared/mapData';
import { GameEngine, GamePlayer } from './gameEngine';
import { sanitizeChatMessage } from './chatFilter';

type BotPersonality = 'DETETIVE' | 'DEFENSIVO' | 'ACUSADOR' | 'CAUTELOSO' | 'OBSERVADOR';

const PERSONALITIES: BotPersonality[] = ['DETETIVE', 'DEFENSIVO', 'ACUSADOR', 'CAUTELOSO', 'OBSERVADOR'];

interface BotMemory {
  personality: BotPersonality;
  currentRoomName: string;
  seenPlayers: Map<string, { x: number; y: number; room: string; time: number }>;
  seenBodies: string[];
  suspicionScores: Map<string, number>; // playerId -> 0..100
  myCurrentTaskIndex: number;
  taskTimer: number;
  moveTarget: Vector2D | null;
}

async function generateGeminiBotChat(
  botName: string,
  botRole: 'CREWMATE' | 'IMPOSTOR',
  personality: BotPersonality,
  currentRoom: string,
  reason: 'BODY' | 'EMERGENCY',
  reporterName: string,
  livingPlayers: string[],
  observedContext: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `Você é o jogador virtual '${botName}' em um jogo de dedução social tipo Among Us/MetaMurder.
Sua personalidade: ${personality}.
Seu papel secreto: ${botRole === 'IMPOSTOR' ? 'ASSASSINO (Impostor - simule inocência ou culpe discretamente outros)' : 'TRIPULANTE (Inocente - encontre o assassino)'}.
Sua localização atual na nave: ${currentRoom}.
Evento: ${reason === 'BODY' ? `Corpo denunciado por ${reporterName}` : 'Reunião de Emergência'}.
Jogadores vivos: ${livingPlayers.join(', ')}.
O que você observou: ${observedContext}.

Escreva UMA mensagem curta em Português (máximo 12 palavras) para o chat da reunião, agindo de acordo com sua personalidade. Não use aspas nem prefixos.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 50, temperature: 0.85 }
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

export class BotEngine {
  private gameEngine: GameEngine;
  private memories: Map<string, BotMemory> = new Map();

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
  }

  public initBot(botId: string): void {
    const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
    this.memories.set(botId, {
      personality,
      currentRoomName: 'Refeitório',
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

    if (this.gameEngine.phase === 'MEETING') return;
    if (this.gameEngine.phase !== 'PLAYING') return;

    // Track room location
    const currentRoom = ROOMS.find(r => 
      bot.x >= r.x && bot.x <= r.x + r.width &&
      bot.y >= r.y && bot.y <= r.y + r.height
    );
    if (currentRoom) {
      memory.currentRoomName = currentRoom.name;
    }

    // Scan nearby players & update memory
    this.updateVisionMemory(bot, memory);

    // Check for bodies nearby to report
    for (const body of this.gameEngine.bodies) {
      if (!body.reported && this.dist(bot, body) < 130) {
        if (!memory.seenBodies.includes(body.id)) {
          memory.seenBodies.push(body.id);
          if (bot.role === 'CREWMATE' || Math.random() < 0.5) {
            this.gameEngine.reportBody(bot.id, body.id);
            return;
          }
        }
      }
    }

    // Handle Sabotages
    const activeSab = this.gameEngine.sabotage.activeType;
    if (activeSab && bot.role === 'CREWMATE') {
      if (activeSab === 'LIGHTS') {
        const target = SABOTAGE_NODES.LIGHTS_BREAKER;
        this.moveTowards(bot, target, deltaTime);
        if (this.dist(bot, target) < 70) {
          this.gameEngine.resolveSabotageNode(bot.id, 'LIGHTS_BREAKER');
        }
        return;
      } else if (activeSab === 'REACTOR') {
        const target = SABOTAGE_NODES.REACTOR_PAD_1;
        this.moveTowards(bot, target, deltaTime);
        if (this.dist(bot, target) < 70) {
          this.gameEngine.resolveSabotageNode(bot.id, 'REACTOR_PAD_1');
        }
        return;
      }
    }

    // Role actions
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
      bot.vx = 0;
      bot.vy = 0;
      memory.taskTimer += deltaTime;

      if (memory.taskTimer >= 3.5) {
        this.gameEngine.completeTask(bot.id, currentTask.id);
        memory.taskTimer = 0;
        memory.myCurrentTaskIndex = (memory.myCurrentTaskIndex + 1) % bot.tasks.length;
      }
    }
  }

  private tickImpostorBot(bot: GamePlayer, memory: BotMemory, deltaTime: number): void {
    const killCooldown = bot.killCooldownRemaining;

    if (killCooldown <= 0) {
      const candidates = Array.from(this.gameEngine.players.values()).filter(p => 
        p.id !== bot.id && p.state === 'ALIVE' && p.role === 'CREWMATE' && !p.inVent
      );

      for (const target of candidates) {
        if (this.dist(bot, target) < 90) {
          const witnesses = candidates.filter(other => other.id !== target.id && this.dist(target, other) < 200);
          if (witnesses.length === 0) {
            this.gameEngine.killPlayer(bot.id, target.id);
            if (Math.random() < 0.4) {
              const nearestVent = VENTS.find(v => this.dist(bot, v) < 100);
              if (nearestVent) this.gameEngine.useVent(bot.id, nearestVent.id);
            }
            return;
          }
        }
      }
    }

    if (bot.sabotageCooldownRemaining <= 0 && Math.random() < 0.05) {
      const sabTypes: ('LIGHTS' | 'REACTOR' | 'O2')[] = ['LIGHTS', 'REACTOR', 'O2'];
      this.gameEngine.triggerSabotage(bot.id, sabTypes[Math.floor(Math.random() * sabTypes.length)]);
    }

    if (!memory.moveTarget || this.dist(bot, memory.moveTarget) < 40) {
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
    if (!meeting || !memory) return;

    // Staggered chat timing per bot (2s to 9s into discussion)
    const delay = Math.floor(Math.random() * 7000) + 2000;

    setTimeout(async () => {
      if (this.gameEngine.phase !== 'MEETING') return;

      const livingPlayers = Array.from(this.gameEngine.players.values())
        .filter(p => p.state === 'ALIVE')
        .map(p => p.name);

      const seenNames = Array.from(memory.seenPlayers.keys())
        .map(id => this.gameEngine.players.get(id)?.name)
        .filter(Boolean) as string[];

      const observedText = seenNames.length > 0 ? `Viu ${seenNames.slice(0, 2).join(' e ')} na ${memory.currentRoomName}` : `Estava sozinho na ${memory.currentRoomName}`;

      let msg = await generateGeminiBotChat(
        bot.name,
        bot.role,
        memory.personality,
        memory.currentRoomName,
        meeting.reason,
        meeting.callerName,
        livingPlayers,
        observedText
      );

      // Unique procedural fallbacks tailored to each bot's personality & real location
      if (!msg) {
        msg = this.generateFallbackChat(bot, memory, meeting, livingPlayers, seenNames);
      }

      this.gameEngine.sendChatMessage(bot.id, msg);
    }, delay);
  }

  private generateFallbackChat(
    bot: GamePlayer, 
    memory: BotMemory, 
    meeting: any, 
    livingPlayers: string[], 
    seenNames: string[]
  ): string {
    const room = memory.currentRoomName;
    const isImp = bot.role === 'IMPOSTOR';

    if (isImp) {
      const scapegoats = livingPlayers.filter(n => n !== bot.name);
      const target = scapegoats[Math.floor(Math.random() * scapegoats.length)] || 'alguém';
      const impLines = [
        `Eu estava na ${room} fazendo tarefas, não vi nada.`,
        `Achei a movimentação do ${target} meio suspeita...`,
        `Quem estava perto da ${room}? Eu acabei de passar por lá.`,
        `Eu confio no ${target}, mas não sei quem foi.`,
        `Alguém viu quem estava perto do corpo?`
      ];
      return impLines[Math.floor(Math.random() * impLines.length)];
    }

    // Crewmate fallback by personality
    switch (memory.personality) {
      case 'DETETIVE':
        return meeting.reason === 'BODY' 
          ? `Onde exatamente foi encontrado? Eu estava na ${room}.`
          : `Alguém viu alguém saindo da ${room}?`;
      case 'DEFENSIVO':
        return seenNames.length > 0
          ? `Eu estava na ${room} com ${seenNames[0]}, sou 100% inocente!`
          : `Eu estava na ${room} fazendo minhas tarefas.`;
      case 'ACUSADOR':
        const accuseTarget = livingPlayers.find(n => n !== bot.name) || 'alguém';
        return `O ${accuseTarget} estava se movendo de forma muito estranha!`;
      case 'CAUTELOSO':
        return `Vamos ter cuidado pra não expulsar inocente. Alguma prova clara?`;
      case 'OBSERVADOR':
      default:
        return seenNames.length > 0 
          ? `Cruzei com ${seenNames.join(' e ')} há pouco tempo.`
          : `Não vi ninguém suspeito enquanto estava na ${room}.`;
    }
  }

  public handleMeetingVoting(bot: GamePlayer): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;

    setTimeout(() => {
      if (this.gameEngine.phase !== 'MEETING') return;

      const livingPlayers = Array.from(this.gameEngine.players.values()).filter(p => p.state === 'ALIVE' && p.id !== bot.id);
      if (livingPlayers.length === 0) return;

      if (bot.role === 'IMPOSTOR') {
        const crewCandidates = livingPlayers.filter(p => p.role === 'CREWMATE');
        const target = crewCandidates.length > 0 ? crewCandidates[Math.floor(Math.random() * crewCandidates.length)] : livingPlayers[0];
        this.gameEngine.castVote(bot.id, target.id);
      } else {
        if (Math.random() < 0.65) {
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
            room: memory.currentRoomName,
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
