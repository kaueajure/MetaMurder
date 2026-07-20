import { Vector2D, PlayerRole, PlayerState, TaskDefinition } from '../shared/types';
import { TASK_DEFINITIONS, ROOMS, VENTS, EMERGENCY_BUTTON_POS, SABOTAGE_NODES, MAP_BOUNDS } from '../shared/mapData';
import { GameEngine, GamePlayer } from './gameEngine';
import { sanitizeChatMessage } from './chatFilter';

type BotPersonality = 'DETETIVE' | 'DEFENSIVO' | 'ACUSADOR' | 'CAUTELOSO' | 'OBSERVADOR';

const PERSONALITIES: BotPersonality[] = ['DETETIVE', 'DEFENSIVO', 'ACUSADOR', 'CAUTELOSO', 'OBSERVADOR'];

// Diverse fallback chat pools per personality (no API dependency)
const CREWMATE_CHAT_BODY: Record<BotPersonality, string[]> = {
  DETETIVE: [
    'Onde exatamente acharam o corpo? Eu estava fazendo tarefas.',
    'Quem foi o último a ser visto perto do corpo?',
    'Alguém notou alguma coisa estranha antes da denúncia?',
    'Precisamos analisar quem estava sozinho naquele momento.',
  ],
  DEFENSIVO: [
    'Eu estava fazendo tarefas, pode me limpar!',
    'Tenho certeza que não fui eu, estava longe do corpo.',
    'Eu vi gente fazendo tarefa comigo, sou inocente.',
    'Não me votem, eu posso provar minha inocência depois.',
  ],
  ACUSADOR: [
    'Achei muito suspeito quem denunciou, pode ser auto-report.',
    'Alguém aqui estava se movendo estranho antes da reunião.',
    'Eu acho que devemos votar em quem estava mais perto do corpo.',
    'Confiem em mim, eu sei quem é o impostor!',
  ],
  CAUTELOSO: [
    'Calma pessoal, vamos pensar antes de votar errado.',
    'Se não temos certeza, melhor pular o voto.',
    'Votar errado pode custar a partida, cuidado.',
    'Vamos esperar mais provas antes de acusar alguém.',
  ],
  OBSERVADOR: [
    'Eu não vi nada demais por enquanto.',
    'Fiquem atentos na próxima rodada.',
    'Vou observar melhor quem está se movimentando estranho.',
    'Não vi ninguém suspeito, mas estou de olho.',
  ]
};

const CREWMATE_CHAT_EMERGENCY: Record<BotPersonality, string[]> = {
  DETETIVE: [
    'Por que a emergência? Alguém viu algo?',
    'Emergência pra quê? Precisamos de informação.',
    'Quem apertou o botão? O que aconteceu?',
  ],
  DEFENSIVO: [
    'Eu estava fazendo minhas tarefas normalmente...',
    'Nem sabia que iam chamar reunião, estava no meu canto.',
    'Eu sou inocente, prometo.',
  ],
  ACUSADOR: [
    'Quem foi que chamou? Isso é muito suspeito.',
    'Aposto que quem chamou tá tentando desviar atenção!',
    'Emergência sem motivo? Vou ficar de olho.',
  ],
  CAUTELOSO: [
    'Tá, mas tem motivo pra emergência?',
    'Vamos ouvir todo mundo antes de decidir.',
    'Sem provas, melhor pular.',
  ],
  OBSERVADOR: [
    'Estou ouvindo todo mundo, continuem falando.',
    'Alguém tem informação útil?',
    'Vamos ver quem tem mais informação.',
  ]
};

const IMPOSTOR_CHAT_BODY: string[] = [
  'Onde acharam o corpo? Eu estava longe de lá.',
  'Não vi nada, estava fazendo tarefas.',
  'Quem denunciou? Pode ser auto-report, cuidado.',
  'Eu estava no outro lado do mapa quando aconteceu.',
  'Gente, eu acho que o assassino fugiu pela direita.',
  'Não sei quem foi, mas eu sou inocente.',
  'Vamos ter calma e pensar antes de votar.',
  'Eu vi alguém se movimentando estranho perto de lá...',
];

const IMPOSTOR_CHAT_EMERGENCY: string[] = [
  'Por que a emergência? Eu estava no meio de uma tarefa.',
  'Alguém viu algo? Eu não vi nada de suspeito.',
  'Tá, mas quem chamou precisa explicar.',
  'Eu estava fazendo tarefas normalmente, emergência pra quê?',
  'Acho que devíamos pular se ninguém tem prova.',
];

interface BotMemory {
  personality: BotPersonality;
  currentRoomName: string;
  seenPlayers: Map<string, { name: string; room: string; time: number }>;
  seenBodies: string[];
  suspicionScores: Map<string, number>;
  myCurrentTaskIndex: number;
  taskTimer: number;
  moveTarget: Vector2D | null;
  hasChatted: boolean; // prevent duplicate chat in same meeting
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
    const roleText = botRole === 'IMPOSTOR'
      ? 'ASSASSINO (finja inocência, acuse discretamente outros)'
      : 'TRIPULANTE (ajude a encontrar o assassino)';

    const prompt = `Você é '${botName}', personalidade: ${personality}, papel: ${roleText}. Local: ${currentRoom}. Evento: ${reason === 'BODY' ? `Corpo denunciado por ${reporterName}` : 'Reunião de Emergência'}. Jogadores: ${livingPlayers.join(', ')}. ${observedContext}. Escreva UMA frase curta (max 12 palavras) de chat em Português brasileiro. Sem aspas.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 40, temperature: 0.9 }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
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
      moveTarget: null,
      hasChatted: false
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

    // Reset meeting chat flag when playing resumes
    memory.hasChatted = false;

    // Track current room
    const currentRoom = ROOMS.find(r =>
      bot.x >= r.x && bot.x <= r.x + r.width &&
      bot.y >= r.y && bot.y <= r.y + r.height
    );
    if (currentRoom) {
      memory.currentRoomName = currentRoom.name;
    }

    // Scan nearby players
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

    if (bot.sabotageCooldownRemaining <= 0 && Math.random() < 0.03) {
      const sabTypes: ('LIGHTS' | 'REACTOR' | 'O2')[] = ['LIGHTS', 'REACTOR', 'O2'];
      this.gameEngine.triggerSabotage(bot.id, sabTypes[Math.floor(Math.random() * sabTypes.length)]);
    }

    if (!memory.moveTarget || this.dist(bot, memory.moveTarget) < 40) {
      const randomRoom = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      memory.moveTarget = {
        x: randomRoom.x + randomRoom.width / 2 + (Math.random() * 60 - 30),
        y: randomRoom.y + randomRoom.height / 2 + (Math.random() * 60 - 30)
      };
    }

    this.moveTowards(bot, memory.moveTarget, deltaTime);
  }

  public handleMeetingDiscussion(bot: GamePlayer): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;

    const memory = this.memories.get(bot.id);
    const meeting = this.gameEngine.meetingState;
    if (!meeting || !memory) return;
    if (memory.hasChatted) return; // Already chatted this meeting
    memory.hasChatted = true;

    // Each bot gets a unique staggered delay (1s to 6s)
    const delay = 1000 + Math.floor(Math.random() * 5000);

    setTimeout(async () => {
      // Safety: still in meeting?
      if (this.gameEngine.phase !== 'MEETING') return;

      const livingPlayers = Array.from(this.gameEngine.players.values())
        .filter(p => p.state === 'ALIVE')
        .map(p => p.name);

      const seenNames = Array.from(memory.seenPlayers.values())
        .map(v => v.name)
        .filter(Boolean);

      const observedText = seenNames.length > 0
        ? `Viu ${seenNames.slice(0, 2).join(' e ')} na ${memory.currentRoomName}.`
        : `Estava sozinho na ${memory.currentRoomName}.`;

      // Try Gemini AI first (with 4s timeout)
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

      // Fallback to procedural unique chat
      if (!msg) {
        msg = this.generateFallbackChat(bot, memory, meeting, livingPlayers);
      }

      // Double-check still in meeting before sending
      if (this.gameEngine.phase === 'MEETING' || this.gameEngine.meetingState) {
        this.gameEngine.sendChatMessage(bot.id, msg);
      }
    }, delay);
  }

  private generateFallbackChat(
    bot: GamePlayer,
    memory: BotMemory,
    meeting: any,
    livingPlayers: string[]
  ): string {
    const isImp = bot.role === 'IMPOSTOR';
    const isBody = meeting.reason === 'BODY';

    if (isImp) {
      const pool = isBody ? IMPOSTOR_CHAT_BODY : IMPOSTOR_CHAT_EMERGENCY;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Crewmate - personality-based
    const pool = isBody
      ? CREWMATE_CHAT_BODY[memory.personality]
      : CREWMATE_CHAT_EMERGENCY[memory.personality];

    return pool[Math.floor(Math.random() * pool.length)];
  }

  public handleMeetingVoting(bot: GamePlayer): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;

    setTimeout(() => {
      if (this.gameEngine.phase !== 'MEETING') return;

      const livingPlayers = Array.from(this.gameEngine.players.values()).filter(p => p.state === 'ALIVE' && p.id !== bot.id);
      if (livingPlayers.length === 0) return;

      if (bot.role === 'IMPOSTOR') {
        const crewCandidates = livingPlayers.filter(p => p.role === 'CREWMATE');
        const target = crewCandidates.length > 0
          ? crewCandidates[Math.floor(Math.random() * crewCandidates.length)]
          : livingPlayers[0];
        this.gameEngine.castVote(bot.id, target.id);
      } else {
        if (Math.random() < 0.6) {
          const target = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
          this.gameEngine.castVote(bot.id, target.id);
        } else {
          this.gameEngine.castVote(bot.id, 'SKIP');
        }
      }
    }, Math.floor(Math.random() * 4000) + 3000);
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

    const speed = 160 * this.gameEngine.settings.playerSpeed;
    bot.vx = (dx / dist) * speed;
    bot.vy = (dy / dist) * speed;
    bot.facing = dx < 0 ? 'LEFT' : 'RIGHT';

    // Move and clamp to map bounds
    const newX = Math.max(30, Math.min(MAP_BOUNDS.width - 30, bot.x + bot.vx * deltaTime));
    const newY = Math.max(30, Math.min(MAP_BOUNDS.height - 30, bot.y + bot.vy * deltaTime));
    bot.x = newX;
    bot.y = newY;
  }

  private updateVisionMemory(bot: GamePlayer, memory: BotMemory): void {
    for (const p of this.gameEngine.players.values()) {
      if (p.id !== bot.id && p.state === 'ALIVE' && !p.inVent) {
        if (this.dist(bot, p) < 250) {
          memory.seenPlayers.set(p.id, {
            name: p.name,
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
