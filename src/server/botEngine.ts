import { Vector2D, PlayerRole, PlayerState, TaskDefinition } from '../shared/types';
import { TASK_DEFINITIONS, ROOMS, VENTS, EMERGENCY_BUTTON_POS, SABOTAGE_NODES, MAP_BOUNDS } from '../shared/mapData';
import { GameEngine, GamePlayer } from './gameEngine';
import { sanitizeChatMessage } from './chatFilter';

export interface WaypointNode {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
}

export const WAYPOINTS: Record<string, WaypointNode> = {
  CAFETERIA:    { id: 'CAFETERIA',    x: 1100, y: 650,  neighbors: ['D_CAF_NAV', 'D_CAF_SEC', 'D_CAF_WEAP', 'D_CAF_STOR'] },
  NAVIGATION:   { id: 'NAVIGATION',   x: 1750, y: 675,  neighbors: ['D_CAF_NAV'] },
  SECURITY:     { id: 'SECURITY',     x: 590,  y: 650,  neighbors: ['D_CAF_SEC', 'D_SEC_REA', 'D_SEC_ELEC'] },
  REACTOR:      { id: 'REACTOR',      x: 220,  y: 610,  neighbors: ['D_SEC_REA', 'D_REA_UE', 'D_LE_REA'] },
  UPPER_ENGINE: { id: 'UPPER_ENGINE', x: 280,  y: 260,  neighbors: ['D_REA_UE', 'D_UE_MED'] },
  MEDBAY:       { id: 'MEDBAY',       x: 660,  y: 290,  neighbors: ['D_UE_MED', 'D_MED_WEAP'] },
  WEAPONS:      { id: 'WEAPONS',      x: 830,  y: 150,  neighbors: ['D_MED_WEAP', 'D_CAF_WEAP'] },
  ELECTRICAL:   { id: 'ELECTRICAL',   x: 630,  y: 1085, neighbors: ['D_SEC_ELEC', 'D_ELEC_LE', 'D_ELEC_STOR'] },
  LOWER_ENGINE: { id: 'LOWER_ENGINE', x: 250,  y: 1070, neighbors: ['D_ELEC_LE', 'D_LE_REA'] },
  STORAGE:      { id: 'STORAGE',      x: 1170, y: 1120, neighbors: ['D_ELEC_STOR', 'D_CAF_STOR', 'D_STOR_ADM'] },
  ADMIN:        { id: 'ADMIN',        x: 1490, y: 1210, neighbors: ['D_STOR_ADM'] },

  // Doorway / Corridor nodes
  D_CAF_NAV:    { id: 'D_CAF_NAV',    x: 1450, y: 650,  neighbors: ['CAFETERIA', 'NAVIGATION'] },
  D_CAF_SEC:    { id: 'D_CAF_SEC',    x: 810,  y: 650,  neighbors: ['CAFETERIA', 'SECURITY'] },
  D_CAF_WEAP:   { id: 'D_CAF_WEAP',   x: 1080, y: 470,  neighbors: ['CAFETERIA', 'WEAPONS'] },
  D_CAF_STOR:   { id: 'D_CAF_STOR',   x: 1100, y: 890,  neighbors: ['CAFETERIA', 'STORAGE'] },
  D_SEC_REA:    { id: 'D_SEC_REA',    x: 410,  y: 650,  neighbors: ['SECURITY', 'REACTOR'] },
  D_SEC_ELEC:   { id: 'D_SEC_ELEC',   x: 590,  y: 860,  neighbors: ['SECURITY', 'ELECTRICAL'] },
  D_REA_UE:     { id: 'D_REA_UE',     x: 220,  y: 420,  neighbors: ['REACTOR', 'UPPER_ENGINE'] },
  D_UE_MED:     { id: 'D_UE_MED',     x: 460,  y: 260,  neighbors: ['UPPER_ENGINE', 'MEDBAY'] },
  D_MED_WEAP:   { id: 'D_MED_WEAP',   x: 750,  y: 200,  neighbors: ['MEDBAY', 'WEAPONS'] },
  D_ELEC_LE:    { id: 'D_ELEC_LE',    x: 370,  y: 1085, neighbors: ['ELECTRICAL', 'LOWER_ENGINE'] },
  D_LE_REA:     { id: 'D_LE_REA',     x: 220,  y: 800,  neighbors: ['LOWER_ENGINE', 'REACTOR'] },
  D_ELEC_STOR:  { id: 'D_ELEC_STOR',  x: 890,  y: 1120, neighbors: ['ELECTRICAL', 'STORAGE'] },
  D_STOR_ADM:   { id: 'D_STOR_ADM',   x: 1310, y: 1210, neighbors: ['STORAGE', 'ADMIN'] },
};

export function findAStarPath(from: Vector2D, to: Vector2D): Vector2D[] {
  // Find nearest start and end waypoints
  const startKey = findNearestWaypoint(from);
  const endKey = findNearestWaypoint(to);

  if (!startKey || !endKey) return [to];
  if (startKey === endKey) return [to];

  // BFS / A* for shortest node path
  const queue: string[][] = [[startKey]];
  const visited = new Set<string>([startKey]);
  let foundPathKeys: string[] | null = null;

  while (queue.length > 0) {
    const pathKeys = queue.shift()!;
    const lastKey = pathKeys[pathKeys.length - 1];

    if (lastKey === endKey) {
      foundPathKeys = pathKeys;
      break;
    }

    const node = WAYPOINTS[lastKey];
    if (node) {
      for (const neighborKey of node.neighbors) {
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey);
          queue.push([...pathKeys, neighborKey]);
        }
      }
    }
  }

  if (!foundPathKeys) return [to];

  const waypoints: Vector2D[] = foundPathKeys.map(k => ({ x: WAYPOINTS[k].x, y: WAYPOINTS[k].y }));
  waypoints.push(to);
  return waypoints;
}

function findNearestWaypoint(pos: Vector2D): string {
  let closestKey = 'CAFETERIA';
  let minDistance = Infinity;

  for (const [key, wp] of Object.entries(WAYPOINTS)) {
    const dx = wp.x - pos.x;
    const dy = wp.y - pos.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDistance) {
      minDistance = dist;
      closestKey = key;
    }
  }

  return closestKey;
}

type BotPersonality = 'DETETIVE' | 'DEFENSIVO' | 'ACUSADOR' | 'CAUTELOSO' | 'OBSERVADOR' | 'JOKER';
const PERSONALITIES: BotPersonality[] = ['DETETIVE', 'DEFENSIVO', 'ACUSADOR', 'CAUTELOSO', 'OBSERVADOR', 'JOKER'];

interface BotMemory {
  personality: BotPersonality;
  currentRoomName: string;
  previousRoom: string;
  seenPlayers: Map<string, { name: string; room: string; time: number }>;
  seenBodies: string[];
  suspicionTarget: string | null;
  alibiPartner: string | null;
  myCurrentTaskIndex: number;
  taskTimer: number;
  moveTarget: Vector2D | null;
  currentPath: Vector2D[];
  pathIndex: number;
  chatCount: number;
  maxChats: number;
  lastChatTime: number;
  pendingDefense: boolean;
}

// Gemini AI chat with conversation history for natural dialogue
async function generateGeminiBotChat(
  botName: string,
  botRole: 'CREWMATE' | 'IMPOSTOR',
  personality: BotPersonality,
  currentRoom: string,
  previousRoom: string,
  reason: 'BODY' | 'EMERGENCY',
  reporterName: string,
  livingPlayers: string[],
  recentChat: string[], // last 5 chat messages for context
  suspicionTarget: string | null,
  alibiPartner: string | null
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const roleDesc = botRole === 'IMPOSTOR'
      ? 'Você é o ASSASSINO. Minta, desvie atenção, acuse outros. Nunca admita.'
      : 'Você é TRIPULANTE inocente. Analise, investigue, acuse quem parecer suspeito.';

    const chatContext = recentChat.length > 0
      ? `Mensagens recentes do chat:\n${recentChat.join('\n')}\n`
      : '';

    const suspicion = suspicionTarget ? `Você desconfia de ${suspicionTarget}.` : '';
    const alibi = alibiPartner ? `Você estava com ${alibiPartner} antes da reunião.` : '';

    const prompt = `Você é "${botName}" em MetaMurder (jogo de dedução social). Personalidade: ${personality}. ${roleDesc}
Local: ${currentRoom} (antes: ${previousRoom}). ${suspicion} ${alibi}
Evento: ${reason === 'BODY' ? `Corpo denunciado por ${reporterName}` : 'Reunião de emergência'}.
Jogadores vivos: ${livingPlayers.join(', ')}.
${chatContext}
Responda ao chat como um jogador REAL brasileiro. Use gírias, abreviações, seja informal. Máximo 15 palavras. Responda ou reaja à última mensagem se relevante. Sem aspas.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 40, temperature: 1.0 }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return reply ? reply.replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}

// === RICH FALLBACK CHAT POOLS ===
const CREW_BODY_POOL: Record<BotPersonality, string[]> = {
  DETETIVE: [
    'Onde acharam o corpo? Quem estava perto?',
    'Alguém tem prova? Eu preciso de informação.',
    'Quem foi a última pessoa vista perto de lá?',
    'Suspeito de quem estava na mesma sala do corpo.',
  ],
  DEFENSIVO: [
    'Eu estava longe, pode me limpar.',
    'Juro que tava fazendo tarefa na {room}.',
    'Tava com {alibi} o tempo todo, pergunta pra ele.',
    'Eu nem cheguei perto do corpo.',
  ],
  ACUSADOR: [
    'Quem denunciou? Pode ser auto-report...',
    'Aposto que foi o {suspect}, tava estranho!',
    'Muito conveniente aparecer o corpo agora né.',
    'Eu vi {suspect} se movendo estranho!',
  ],
  CAUTELOSO: [
    'Sem prova clara melhor pular o voto.',
    'Calma gente, vamos pensar direito.',
    'Não vamos expulsar inocente por favor.',
    'Alguém tem certeza de algo? Se não, skip.',
  ],
  OBSERVADOR: [
    'Eu não vi nada suspeito por enquanto.',
    'Fiquem atentos, vou observar mais.',
    'Cruzei com gente na {room} mas nada demais.',
    'Vamos ver quem não tem álibi.',
  ],
  JOKER: [
    'kkkk quem morreu? triste',
    'mano, outro corpo? tá difícil',
    'se votar em mim vou chorar irl',
    'alguém reporta corpo e some né kk',
  ]
};

const CREW_EMERGENCY_POOL: Record<BotPersonality, string[]> = {
  DETETIVE: ['Pq chamaram emergência? Alguém viu algo?', 'Tem motivo pra essa emergência?'],
  DEFENSIVO: ['Eu tava fazendo tarefa, nem vi nada.', 'Sou inocente, tava na {room}.'],
  ACUSADOR: ['Quem apertou o botão? Isso é sus.', 'Aposto que chamaram pra desviar atenção!'],
  CAUTELOSO: ['Sem motivo, melhor dar skip.', 'Vamos ouvir antes de acusar.'],
  OBSERVADOR: ['Alguém tem info? Tô ouvindo.', 'Sem dados, difícil votar.'],
  JOKER: ['emergência pra quê mano kk', 'apertaram o botão sem querer?'],
};

const IMP_BODY_POOL: string[] = [
  'Onde acharam? Eu tava longe.',
  'Eu tava na {room}, não fui eu.',
  'Pode ser auto-report hein...',
  'Eu vi {suspect} perto de lá.',
  'Gente, eu sou inocente, tava fazendo tarefa.',
  'Não fui eu, juro.',
  'Vamos votar em quem não tem álibi.',
];

const IMP_EMERGENCY_POOL: string[] = [
  'Emergência pra quê? Eu tava de boa.',
  'Tava fazendo tarefa na {room}.',
  'Acho que deveria dar skip se ninguém tem prova.',
  'Eu juro que não fiz nada.',
];

// Reaction messages when accused or responding to others
const REACTION_ACCUSED: string[] = [
  'Eu?? Tá maluco, não fui eu!',
  'Mano por que me acusando? Sou inocente!',
  'Se me expulsar vão perder, sou crew.',
  'Prova? Eu não fiz nada!',
  'Olha pra outro, eu tava fazendo tarefa.',
  'Votando em mim? Sério? Vão se arrepender.',
];

const REACTION_AGREE: string[] = [
  'Concordo, vamos votar nele.',
  'Tô nessa, vota!',
  'Faz sentido, bora.',
  'Sim, ele tá muito sus.',
];

export class BotEngine {
  private gameEngine: GameEngine;
  private memories: Map<string, BotMemory> = new Map();

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
  }

  public initBot(botId: string): void {
    this.memories.set(botId, {
      personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)],
      currentRoomName: 'Refeitório',
      previousRoom: 'Refeitório',
      seenPlayers: new Map(),
      seenBodies: [],
      suspicionTarget: null,
      alibiPartner: null,
      myCurrentTaskIndex: 0,
      taskTimer: 0,
      moveTarget: null,
      currentPath: [],
      pathIndex: 0,
      chatCount: 0,
      maxChats: 2 + Math.floor(Math.random() * 2), // 2-3
      lastChatTime: 0,
      pendingDefense: false,
    });
  }

  public tick(bot: GamePlayer, deltaTime: number): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;
    let memory = this.memories.get(bot.id);
    if (!memory) { this.initBot(bot.id); memory = this.memories.get(bot.id)!; }

    if (this.gameEngine.phase === 'MEETING') return;
    if (this.gameEngine.phase !== 'PLAYING') return;

    // Reset meeting state
    memory.chatCount = 0;
    memory.maxChats = 2 + Math.floor(Math.random() * 2);

    // Track room
    const prevRoom = memory.currentRoomName;
    const currentRoom = ROOMS.find(r =>
      bot.x >= r.x && bot.x <= r.x + r.width &&
      bot.y >= r.y && bot.y <= r.y + r.height
    );
    if (currentRoom) {
      memory.previousRoom = prevRoom;
      memory.currentRoomName = currentRoom.name;
    }

    this.updateVisionMemory(bot, memory);

    // Bodies
    for (const body of this.gameEngine.bodies) {
      if (!body.reported && this.dist(bot, body) < 140) {
        if (!memory.seenBodies.includes(body.id)) {
          memory.seenBodies.push(body.id);
          if (bot.role === 'CREWMATE' || Math.random() < 0.5) {
            this.gameEngine.reportBody(bot.id, body.id);
            return;
          }
        }
      }
    }

    // Sabotage response
    const activeSab = this.gameEngine.sabotage.activeType;
    if (activeSab && bot.role === 'CREWMATE') {
      if (activeSab === 'LIGHTS') {
        this.moveTowards(bot, SABOTAGE_NODES.LIGHTS_BREAKER, deltaTime);
        if (this.dist(bot, SABOTAGE_NODES.LIGHTS_BREAKER) < 70) this.gameEngine.resolveSabotageNode(bot.id, 'LIGHTS_BREAKER');
        return;
      } else if (activeSab === 'REACTOR') {
        this.moveTowards(bot, SABOTAGE_NODES.REACTOR_PAD_1, deltaTime);
        if (this.dist(bot, SABOTAGE_NODES.REACTOR_PAD_1) < 70) this.gameEngine.resolveSabotageNode(bot.id, 'REACTOR_PAD_1');
        return;
      }
    }

    if (bot.role === 'CREWMATE') this.tickCrewmate(bot, memory, deltaTime);
    else this.tickImpostor(bot, memory, deltaTime);
  }

  private tickCrewmate(bot: GamePlayer, memory: BotMemory, dt: number): void {
    if (bot.tasks.length === 0) return;
    const task = bot.tasks[memory.myCurrentTaskIndex];
    if (!task || task.completed) {
      const next = bot.tasks.findIndex(t => !t.completed);
      if (next !== -1) memory.myCurrentTaskIndex = next;
      return;
    }
    const d = this.dist(bot, { x: task.x, y: task.y });
    if (d > 50) { this.moveTowards(bot, { x: task.x, y: task.y }, dt); memory.taskTimer = 0; }
    else {
      bot.vx = 0; bot.vy = 0;
      memory.taskTimer += dt;
      if (memory.taskTimer >= 3.0) {
        this.gameEngine.completeTask(bot.id, task.id);
        memory.taskTimer = 0;
        memory.myCurrentTaskIndex = (memory.myCurrentTaskIndex + 1) % bot.tasks.length;
      }
    }
  }

  private tickImpostor(bot: GamePlayer, memory: BotMemory, dt: number): void {
    if (bot.killCooldownRemaining <= 0) {
      const targets = Array.from(this.gameEngine.players.values()).filter(p =>
        p.id !== bot.id && p.state === 'ALIVE' && p.role === 'CREWMATE' && !p.inVent
      );
      for (const t of targets) {
        if (this.dist(bot, t) < 90) {
          const witnesses = targets.filter(o => o.id !== t.id && this.dist(t, o) < 220);
          if (witnesses.length === 0) {
            this.gameEngine.killPlayer(bot.id, t.id);
            if (Math.random() < 0.35) {
              const vent = VENTS.find(v => this.dist(bot, v) < 120);
              if (vent) this.gameEngine.useVent(bot.id, vent.id);
            }
            return;
          }
        }
      }
    }

    if (bot.sabotageCooldownRemaining <= 0 && Math.random() < 0.02) {
      const types: ('LIGHTS' | 'REACTOR' | 'O2')[] = ['LIGHTS', 'REACTOR', 'O2'];
      this.gameEngine.triggerSabotage(bot.id, types[Math.floor(Math.random() * types.length)]);
    }

    if (!memory.moveTarget || this.dist(bot, memory.moveTarget) < 40) {
      const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      memory.moveTarget = {
        x: room.x + room.width / 2 + (Math.random() * 80 - 40),
        y: room.y + room.height / 2 + (Math.random() * 80 - 40)
      };
    }
    this.moveTowards(bot, memory.moveTarget, dt);
  }

  // === MEETING DISCUSSION (multiple messages, reactive) ===
  public handleMeetingDiscussion(bot: GamePlayer): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;
    const memory = this.memories.get(bot.id);
    const meeting = this.gameEngine.meetingState;
    if (!meeting || !memory) return;

    // Build suspicion and alibi
    this.buildSuspicionAndAlibi(bot, memory);

    // Send 2-3 staggered messages
    for (let i = 0; i < memory.maxChats; i++) {
      const delay = 1500 + (i * 3000) + Math.floor(Math.random() * 2000);
      setTimeout(() => this.sendBotChat(bot, memory, i), delay);
    }
  }

  /**
   * React to a human mentioning a living bot during a meeting. This is
   * triggered by the incoming message instead of waiting for one of the
   * discussion messages scheduled when the meeting began.
   */
  public handleChatMention(sender: GamePlayer, text: string): void {
    if (!this.gameEngine.meetingState || this.gameEngine.phase !== 'MEETING') return;
    if (sender.isBot || sender.state !== 'ALIVE') return;

    for (const bot of this.gameEngine.players.values()) {
      if (!bot.isBot || bot.state !== 'ALIVE' || bot.id === sender.id) continue;
      if (!this.mentionsPlayer(text, bot.name)) continue;

      const memory = this.memories.get(bot.id);
      if (!memory || memory.pendingDefense) continue;

      memory.pendingDefense = true;
      const delay = 450 + Math.floor(Math.random() * 400);

      setTimeout(() => {
        memory.pendingDefense = false;
        if (this.gameEngine.phase !== 'MEETING' || !this.gameEngine.meetingState) return;
        if (bot.state !== 'ALIVE') return;

        const defense = REACTION_ACCUSED[Math.floor(Math.random() * REACTION_ACCUSED.length)];
        this.gameEngine.sendChatMessage(bot.id, defense);
      }, delay);
    }
  }

  private mentionsPlayer(text: string, playerName: string): boolean {
    const normalize = (value: string) => value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');

    const escapedName = normalize(playerName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionPattern = new RegExp(
      `(^|[^\\p{L}\\p{N}_])${escapedName}(?=$|[^\\p{L}\\p{N}_])`,
      'u'
    );

    return mentionPattern.test(normalize(text));
  }

  private buildSuspicionAndAlibi(bot: GamePlayer, memory: BotMemory): void {
    const living = Array.from(this.gameEngine.players.values()).filter(p => p.state === 'ALIVE' && p.id !== bot.id);
    const seen = Array.from(memory.seenPlayers.values());

    // Alibi: last player seen recently
    if (seen.length > 0) {
      memory.alibiPartner = seen[seen.length - 1].name;
    }

    // Suspicion target
    if (bot.role === 'CREWMATE') {
      // Suspect random living player not recently seen
      const unseen = living.filter(p => !memory.seenPlayers.has(p.id));
      if (unseen.length > 0) memory.suspicionTarget = unseen[Math.floor(Math.random() * unseen.length)].name;
      else memory.suspicionTarget = living[Math.floor(Math.random() * living.length)]?.name || null;
    } else {
      // Impostor: frame a crewmate
      const crew = living.filter(p => p.role === 'CREWMATE');
      memory.suspicionTarget = crew.length > 0 ? crew[Math.floor(Math.random() * crew.length)].name : null;
    }
  }

  private async sendBotChat(bot: GamePlayer, memory: BotMemory, msgIndex: number): Promise<void> {
    if (this.gameEngine.phase !== 'MEETING' && !this.gameEngine.meetingState) return;
    if (memory.chatCount >= memory.maxChats) return;
    memory.chatCount++;

    const meeting = this.gameEngine.meetingState;
    if (!meeting) return;

    const livingNames = Array.from(this.gameEngine.players.values())
      .filter(p => p.state === 'ALIVE').map(p => p.name);

    // Get recent chat for context-aware responses
    const recentChat = this.gameEngine.chatMessages
      .slice(-6)
      .map(m => `${m.senderName}: ${m.text}`);

    // Check if bot was accused in recent chat
    const wasAccused = recentChat.some(m =>
      m.toLowerCase().includes(bot.name.toLowerCase()) &&
      (m.includes('sus') || m.includes('suspeito') || m.includes('votar') || m.includes('foi') || m.includes('acus'))
    );

    let msg: string | null = null;

    // If accused, react defensively
    if (wasAccused && msgIndex > 0) {
      msg = REACTION_ACCUSED[Math.floor(Math.random() * REACTION_ACCUSED.length)];
    } else {
      // Try Gemini AI
      msg = await generateGeminiBotChat(
        bot.name, bot.role, memory.personality,
        memory.currentRoomName, memory.previousRoom,
        meeting.reason, meeting.callerName,
        livingNames, recentChat,
        memory.suspicionTarget, memory.alibiPartner
      );
    }

    // Fallback
    if (!msg) {
      msg = this.getFallbackMessage(bot, memory, meeting, livingNames, msgIndex, wasAccused);
    }

    // Replace placeholders
    msg = msg.replace('{room}', memory.currentRoomName)
             .replace('{suspect}', memory.suspicionTarget || 'alguém')
             .replace('{alibi}', memory.alibiPartner || 'ninguém');

    if (this.gameEngine.phase === 'MEETING' || this.gameEngine.meetingState) {
      this.gameEngine.sendChatMessage(bot.id, msg);
    }
  }

  private getFallbackMessage(bot: GamePlayer, memory: BotMemory, meeting: any, livingNames: string[], msgIndex: number, wasAccused: boolean): string {
    if (wasAccused) return REACTION_ACCUSED[Math.floor(Math.random() * REACTION_ACCUSED.length)];

    const isBody = meeting.reason === 'BODY';
    const isImp = bot.role === 'IMPOSTOR';

    if (isImp) {
      const pool = isBody ? IMP_BODY_POOL : IMP_EMERGENCY_POOL;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Second message can be a reaction/agreement
    if (msgIndex > 0 && Math.random() < 0.5) {
      return REACTION_AGREE[Math.floor(Math.random() * REACTION_AGREE.length)];
    }

    const pool = isBody ? CREW_BODY_POOL[memory.personality] : CREW_EMERGENCY_POOL[memory.personality];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // === INTELLIGENT VOTING ===
  public handleMeetingVoting(bot: GamePlayer): void {
    if (bot.state === 'DEAD' || bot.state === 'GHOST') return;

    setTimeout(() => {
      if (this.gameEngine.phase !== 'MEETING') return;
      const living = Array.from(this.gameEngine.players.values()).filter(p => p.state === 'ALIVE' && p.id !== bot.id);
      if (living.length === 0) return;

      const memory = this.memories.get(bot.id);

      if (bot.role === 'IMPOSTOR') {
        // Vote for crewmate, prefer the one most accused in chat
        const crew = living.filter(p => p.role === 'CREWMATE');
        const mostAccused = this.findMostAccusedInChat(crew);
        const target = mostAccused || crew[Math.floor(Math.random() * crew.length)] || living[0];
        this.gameEngine.castVote(bot.id, target.id);
      } else {
        // Crewmate: vote for suspicion target if available
        if (memory?.suspicionTarget && Math.random() < 0.7) {
          const suspect = living.find(p => p.name === memory.suspicionTarget);
          if (suspect) { this.gameEngine.castVote(bot.id, suspect.id); return; }
        }
        // Follow chat consensus
        const mostAccused = this.findMostAccusedInChat(living);
        if (mostAccused && Math.random() < 0.6) {
          this.gameEngine.castVote(bot.id, mostAccused.id);
        } else if (Math.random() < 0.4) {
          this.gameEngine.castVote(bot.id, 'SKIP');
        } else {
          this.gameEngine.castVote(bot.id, living[Math.floor(Math.random() * living.length)].id);
        }
      }
    }, Math.floor(Math.random() * 4000) + 3000);
  }

  private findMostAccusedInChat(candidates: GamePlayer[]): GamePlayer | null {
    const mentions: Map<string, number> = new Map();
    const susWords = ['sus', 'suspeito', 'votar', 'expulsar', 'foi ele', 'foi ela', 'foi o', 'foi a'];

    for (const msg of this.gameEngine.chatMessages) {
      const lower = msg.text.toLowerCase();
      if (susWords.some(w => lower.includes(w))) {
        for (const c of candidates) {
          if (lower.includes(c.name.toLowerCase())) {
            mentions.set(c.id, (mentions.get(c.id) || 0) + 1);
          }
        }
      }
    }

    let best: GamePlayer | null = null;
    let bestCount = 0;
    for (const c of candidates) {
      const count = mentions.get(c.id) || 0;
      if (count > bestCount) { best = c; bestCount = count; }
    }
    return best;
  }

  private moveTowards(bot: GamePlayer, target: Vector2D, dt: number): void {
    const memory = this.memories.get(bot.id);
    if (!memory) return;

    // Recalculate path if target moved or path empty
    if (!memory.moveTarget || this.dist(memory.moveTarget, target) > 30 || memory.currentPath.length === 0) {
      memory.moveTarget = target;
      memory.currentPath = findAStarPath({ x: bot.x, y: bot.y }, target);
      memory.pathIndex = 0;
    }

    const currentWaypoint = memory.currentPath[memory.pathIndex] || target;
    const dx = currentWaypoint.x - bot.x;
    const dy = currentWaypoint.y - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 25) {
      if (memory.pathIndex < memory.currentPath.length - 1) {
        memory.pathIndex++;
      } else {
        bot.vx = 0;
        bot.vy = 0;
        return;
      }
    }

    const speed = 160 * this.gameEngine.settings.playerSpeed;
    const stepDx = currentWaypoint.x - bot.x;
    const stepDy = currentWaypoint.y - bot.y;
    const stepDist = Math.sqrt(stepDx * stepDx + stepDy * stepDy) || 1;

    bot.vx = (stepDx / stepDist) * speed;
    bot.vy = (stepDy / stepDist) * speed;
    bot.facing = stepDx < 0 ? 'LEFT' : 'RIGHT';
    bot.x = Math.max(30, Math.min(MAP_BOUNDS.width - 30, bot.x + bot.vx * dt));
    bot.y = Math.max(30, Math.min(MAP_BOUNDS.height - 30, bot.y + bot.vy * dt));
  }

  private updateVisionMemory(bot: GamePlayer, memory: BotMemory): void {
    for (const p of this.gameEngine.players.values()) {
      if (p.id !== bot.id && p.state === 'ALIVE' && !p.inVent && this.dist(bot, p) < 280) {
        memory.seenPlayers.set(p.id, { name: p.name, room: memory.currentRoomName, time: Date.now() });
      }
    }
  }

  private dist(a: Vector2D, b: Vector2D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
}
