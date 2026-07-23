import { Vector2D } from '../shared/types';
import { ROOMS, SABOTAGE_NODES, MAP_BOUNDS } from '../shared/mapData';
import { clampGhostPosition, clampPosition } from '../shared/mapCollision';
import { GameEngine, GamePlayer } from './gameEngine';
import {
  BotActionDecision,
  BotAIProvider,
  BotWorldAction,
  GeminiBotAI
} from './geminiBotAI';

export interface WaypointNode {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
}

export const WAYPOINTS: Record<string, WaypointNode> = {
  FUMODROMO:      { id: 'FUMODROMO', x: 205, y: 330, neighbors: ['D_FUMO'] },
  CONSULTORIA:    { id: 'CONSULTORIA', x: 585, y: 180, neighbors: ['D_CONSULT'] },
  SALA_LAZER:     { id: 'SALA_LAZER', x: 710, y: 430, neighbors: ['D_LAZER'] },
  BANHEIRO_NORTE: { id: 'BANHEIRO_NORTE', x: 900, y: 160, neighbors: ['D_BATH_N'] },
  ACESSO_NORTE:   { id: 'ACESSO_NORTE', x: 900, y: 420, neighbors: ['D_BATH_N', 'D_ACCESS_N'] },
  AREA_VERDE:     { id: 'AREA_VERDE', x: 1200, y: 170, neighbors: ['D_GREEN'] },
  REUNIAO:        { id: 'REUNIAO', x: 1050, y: 420, neighbors: ['D_GREEN', 'D_REUNIAO'] },
  DESENVOLVIMENTO: { id: 'DESENVOLVIMENTO', x: 1770, y: 260, neighbors: ['D_DEV'] },
  COMERCIAL:      { id: 'COMERCIAL', x: 2110, y: 310, neighbors: ['D_COMM'] },
  BANHEIRO_LESTE: { id: 'BANHEIRO_LESTE', x: 2260, y: 150, neighbors: ['D_BATH_E'] },
  ACESSO_LESTE:   { id: 'ACESSO_LESTE', x: 2260, y: 410, neighbors: ['D_BATH_E', 'D_ACCESS_E'] },
  COZINHA:        { id: 'COZINHA', x: 600, y: 795, neighbors: ['D_KITCHEN', 'D_BATH_M', 'D_BATH_F'] },
  BANHEIRO_M:     { id: 'BANHEIRO_M', x: 775, y: 720, neighbors: ['D_BATH_M'] },
  BANHEIRO_F:     { id: 'BANHEIRO_F', x: 775, y: 865, neighbors: ['D_BATH_F'] },
  SALA_DIGUINHO:  { id: 'SALA_DIGUINHO', x: 1120, y: 795, neighbors: ['D_DIGUINHO'] },
  SUPRIMENTOS:    { id: 'SUPRIMENTOS', x: 1420, y: 720, neighbors: ['D_SUPPLY', 'D_SERVER'] },
  SERVER:         { id: 'SERVER', x: 1420, y: 880, neighbors: ['D_SERVER'] },
  SALA_TONHO:     { id: 'SALA_TONHO', x: 1840, y: 795, neighbors: ['D_TONHO'] },
  GARAGEM:        { id: 'GARAGEM', x: 2110, y: 690, neighbors: ['D_GARAGE'] },

  D_FUMO:      { id: 'D_FUMO', x: 295, y: 530, neighbors: ['FUMODROMO', 'C_FUMO'] },
  D_CONSULT:   { id: 'D_CONSULT', x: 510, y: 530, neighbors: ['CONSULTORIA', 'C_CONSULT'] },
  D_LAZER:     { id: 'D_LAZER', x: 710, y: 530, neighbors: ['SALA_LAZER', 'C_LAZER'] },
  D_BATH_N:    { id: 'D_BATH_N', x: 900, y: 280, neighbors: ['BANHEIRO_NORTE', 'ACESSO_NORTE'] },
  D_ACCESS_N:  { id: 'D_ACCESS_N', x: 900, y: 530, neighbors: ['ACESSO_NORTE', 'C_ACCESS_N'] },
  D_GREEN:     { id: 'D_GREEN', x: 1200, y: 280, neighbors: ['AREA_VERDE', 'REUNIAO'] },
  D_REUNIAO:   { id: 'D_REUNIAO', x: 1050, y: 530, neighbors: ['REUNIAO', 'C_REUNIAO'] },
  D_DEV:       { id: 'D_DEV', x: 1750, y: 530, neighbors: ['DESENVOLVIMENTO', 'C_DEV'] },
  D_COMM:      { id: 'D_COMM', x: 2030, y: 530, neighbors: ['COMERCIAL', 'C_COMM'] },
  D_BATH_E:    { id: 'D_BATH_E', x: 2250, y: 260, neighbors: ['BANHEIRO_LESTE', 'ACESSO_LESTE'] },
  D_ACCESS_E:  { id: 'D_ACCESS_E', x: 2250, y: 530, neighbors: ['ACESSO_LESTE', 'C_ACCESS_E'] },
  D_KITCHEN:   { id: 'D_KITCHEN', x: 285, y: 680, neighbors: ['COZINHA', 'C_KITCHEN'] },
  D_BATH_M:    { id: 'D_BATH_M', x: 680, y: 730, neighbors: ['COZINHA', 'BANHEIRO_M'] },
  D_BATH_F:    { id: 'D_BATH_F', x: 680, y: 865, neighbors: ['COZINHA', 'BANHEIRO_F'] },
  D_DIGUINHO:  { id: 'D_DIGUINHO', x: 1150, y: 680, neighbors: ['SALA_DIGUINHO', 'C_DIGUINHO'] },
  D_SUPPLY:    { id: 'D_SUPPLY', x: 1400, y: 680, neighbors: ['SUPRIMENTOS', 'C_SUPPLY'] },
  D_SERVER:    { id: 'D_SERVER', x: 1520, y: 820, neighbors: ['SUPRIMENTOS', 'SERVER'] },
  D_TONHO:     { id: 'D_TONHO', x: 1680, y: 680, neighbors: ['SALA_TONHO', 'C_TONHO'] },
  D_GARAGE:    { id: 'D_GARAGE', x: 2120, y: 680, neighbors: ['GARAGEM', 'C_GARAGE'] },

  C_FUMO:     { id: 'C_FUMO', x: 295, y: 605, neighbors: ['D_FUMO', 'C_CONSULT', 'C_KITCHEN'] },
  C_KITCHEN:  { id: 'C_KITCHEN', x: 285, y: 605, neighbors: ['D_KITCHEN', 'C_FUMO'] },
  C_CONSULT:  { id: 'C_CONSULT', x: 510, y: 605, neighbors: ['D_CONSULT', 'C_FUMO', 'C_LAZER'] },
  C_LAZER:    { id: 'C_LAZER', x: 710, y: 605, neighbors: ['D_LAZER', 'C_CONSULT', 'C_ACCESS_N'] },
  C_ACCESS_N: { id: 'C_ACCESS_N', x: 900, y: 605, neighbors: ['D_ACCESS_N', 'C_LAZER', 'C_REUNIAO'] },
  C_REUNIAO:  { id: 'C_REUNIAO', x: 1050, y: 605, neighbors: ['D_REUNIAO', 'C_ACCESS_N', 'C_DIGUINHO'] },
  C_DIGUINHO: { id: 'C_DIGUINHO', x: 1150, y: 605, neighbors: ['D_DIGUINHO', 'C_REUNIAO', 'C_SUPPLY'] },
  C_SUPPLY:   { id: 'C_SUPPLY', x: 1400, y: 605, neighbors: ['D_SUPPLY', 'C_DIGUINHO', 'C_TONHO'] },
  C_TONHO:    { id: 'C_TONHO', x: 1680, y: 605, neighbors: ['D_TONHO', 'C_SUPPLY', 'C_DEV'] },
  C_DEV:      { id: 'C_DEV', x: 1750, y: 605, neighbors: ['D_DEV', 'C_TONHO', 'C_COMM'] },
  C_COMM:     { id: 'C_COMM', x: 2030, y: 605, neighbors: ['D_COMM', 'C_DEV', 'C_GARAGE'] },
  C_GARAGE:   { id: 'C_GARAGE', x: 2120, y: 605, neighbors: ['D_GARAGE', 'C_COMM', 'C_ACCESS_E'] },
  C_ACCESS_E: { id: 'C_ACCESS_E', x: 2250, y: 605, neighbors: ['D_ACCESS_E', 'C_GARAGE'] }
};

export function findAStarPath(from: Vector2D, to: Vector2D): Vector2D[] {
  const startKey = findNearestWaypoint(from);
  const endKey = findNearestWaypoint(to);
  if (startKey === endKey) return [to];

  const queue: string[][] = [[startKey]];
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const lastKey = path[path.length - 1];
    if (lastKey === endKey) {
      return [...path.map(key => ({ x: WAYPOINTS[key].x, y: WAYPOINTS[key].y })), to];
    }

    for (const neighbor of WAYPOINTS[lastKey]?.neighbors ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return [to];
}

function findNearestWaypoint(position: Vector2D): string {
  const room = ROOMS.find(candidate =>
    position.x >= candidate.x &&
    position.x <= candidate.x + candidate.width &&
    position.y >= candidate.y &&
    position.y <= candidate.y + candidate.height
  );
  if (room && WAYPOINTS[room.id]) return room.id;

  let closest = 'C_REUNIAO';
  let closestDistance = Infinity;

  for (const [key, waypoint] of Object.entries(WAYPOINTS)) {
    const distance = (waypoint.x - position.x) ** 2 + (waypoint.y - position.y) ** 2;
    if (distance < closestDistance) {
      closest = key;
      closestDistance = distance;
    }
  }
  return closest;
}

type BotPersonality = 'analítico' | 'cauteloso' | 'impulsivo' | 'sociável' | 'desconfiado';
const PERSONALITIES: BotPersonality[] = ['analítico', 'cauteloso', 'impulsivo', 'sociável', 'desconfiado'];

interface SeenPlayer {
  name: string;
  room: string;
  time: number;
}

interface BotMemory {
  personality: BotPersonality;
  currentRoomName: string;
  previousRoom: string;
  seenPlayers: Map<string, SeenPlayer>;
  seenBodies: Set<string>;
  taskTimer: number;
  pathTarget: Vector2D | null;
  currentPath: Vector2D[];
  pathIndex: number;
  decision: BotActionDecision | null;
  decisionPending: boolean;
  nextDecisionAt: number;
  chatCount: number;
  pendingDefense: boolean;
}

export class BotEngine {
  private readonly memories = new Map<string, BotMemory>();
  private readonly ai: BotAIProvider;
  private readonly gameEngine: GameEngine;

  constructor(gameEngine: GameEngine, ai: BotAIProvider = new GeminiBotAI()) {
    this.gameEngine = gameEngine;
    this.ai = ai;
  }

  public initBot(botId: string): void {
    const personalityIndex = Math.abs(this.hash(botId)) % PERSONALITIES.length;
    this.memories.set(botId, {
      personality: PERSONALITIES[personalityIndex],
      currentRoomName: 'Corredor',
      previousRoom: 'Corredor',
      seenPlayers: new Map(),
      seenBodies: new Set(),
      taskTimer: 0,
      pathTarget: null,
      currentPath: [],
      pathIndex: 0,
      decision: null,
      decisionPending: false,
      nextDecisionAt: 0,
      chatCount: 0,
      pendingDefense: false
    });
  }

  public tick(bot: GamePlayer, deltaTime: number): void {
    if (this.gameEngine.phase !== 'PLAYING') return;
    const memory = this.getMemory(bot.id);

    if (bot.state !== 'ALIVE') {
      if (bot.role !== 'CREWMATE') return;
      memory.decision = this.safeOfflineMovement(bot);
      this.executeDecision(bot, memory, deltaTime);
      return;
    }

    this.updateRoom(bot, memory);
    this.updateVision(bot, memory);
    this.requestWorldDecisionWhenNeeded(bot, memory);
    this.executeDecision(bot, memory, deltaTime);
  }

  public handleMeetingDiscussion(bot: GamePlayer): void {
    if (bot.state !== 'ALIVE') return;
    const memory = this.getMemory(bot.id);
    memory.chatCount = 0;
    memory.decision = null;

    [1200, 5600].forEach(delay => {
      setTimeout(() => void this.sendAIChat(bot, memory), delay + Math.abs(this.hash(bot.id)) % 700);
    });
  }

  public handleChatMention(sender: GamePlayer, text: string): void {
    if (!this.gameEngine.meetingState || this.gameEngine.phase !== 'MEETING') return;
    if (sender.isBot || sender.state !== 'ALIVE') return;

    for (const bot of this.gameEngine.players.values()) {
      if (!bot.isBot || bot.state !== 'ALIVE' || !this.mentionsPlayer(text, bot.name)) continue;
      const memory = this.getMemory(bot.id);
      if (memory.pendingDefense) continue;

      memory.pendingDefense = true;
      setTimeout(() => {
        void this.sendAIChat(
          bot,
          memory,
          `${sender.name} mencionou você diretamente. Responda à mensagem de forma natural e defenda-se se houver acusação.`
        ).finally(() => {
          memory.pendingDefense = false;
        });
      }, 450);
    }
  }

  public handleMeetingVoting(bot: GamePlayer): void {
    if (bot.state !== 'ALIVE') return;

    const delay = 1800 + Math.abs(this.hash(`${bot.id}:vote`)) % 2200;
    setTimeout(() => void this.castAIVote(bot), delay);
  }

  private requestWorldDecisionWhenNeeded(bot: GamePlayer, memory: BotMemory): void {
    const now = Date.now();
    if (memory.decisionPending || now < memory.nextDecisionAt) return;

    if (!this.ai.configured) {
      memory.decision = this.safeOfflineMovement(bot);
      memory.nextDecisionAt = now + 5000;
      return;
    }

    memory.decisionPending = true;
    const validTargets = this.validWorldTargets(bot, memory);
    const context = this.buildContext(bot, memory, false);

    void this.ai.chooseAction(context, validTargets).then(decision => {
      if (this.gameEngine.phase !== 'PLAYING' || bot.state !== 'ALIVE') return;
      if (decision && this.isDecisionAllowed(bot, decision, validTargets)) {
        memory.decision = decision;
        memory.pathTarget = null;
        memory.currentPath = [];
        memory.pathIndex = 0;
        memory.taskTimer = 0;
      }
      const configuredInterval = Number(process.env.GEMINI_ACTION_INTERVAL_MS);
      const baseInterval = Number.isFinite(configuredInterval) && configuredInterval >= 5000
        ? configuredInterval
        : 12_000;
      memory.nextDecisionAt = Date.now() + baseInterval + Math.abs(this.hash(`${bot.id}:${now}`)) % 3000;
    }).finally(() => {
      memory.decisionPending = false;
      if (!memory.decision) memory.nextDecisionAt = Date.now() + 3000;
    });
  }

  private executeDecision(bot: GamePlayer, memory: BotMemory, deltaTime: number): void {
    const decision = memory.decision ?? this.safeOfflineMovement(bot);

    switch (decision.action) {
      case 'DO_TASK':
        this.executeTask(bot, memory, decision.target, deltaTime);
        return;
      case 'GO_ROOM': {
        const room = ROOMS.find(candidate => candidate.id === decision.target);
        if (!room) return this.invalidateDecision(memory);
        this.moveTowards(bot, memory, {
          x: room.x + room.width / 2,
          y: room.y + room.height / 2
        }, deltaTime);
        return;
      }
      case 'FOLLOW_PLAYER':
      case 'HUNT_PLAYER': {
        const target = this.gameEngine.players.get(decision.target);
        if (!target || target.state !== 'ALIVE' || target.inVent || target.id === bot.id) {
          return this.invalidateDecision(memory);
        }
        this.moveTowards(bot, memory, target, deltaTime);
        if (
          decision.action === 'HUNT_PLAYER' &&
          bot.role === 'IMPOSTOR' &&
          bot.killCooldownRemaining <= 0 &&
          this.distance(bot, target) < 90
        ) {
          this.gameEngine.killPlayer(bot.id, target.id);
          this.invalidateDecision(memory);
        }
        return;
      }
      case 'REPORT_BODY': {
        const body = this.gameEngine.bodies.find(candidate => candidate.id === decision.target && !candidate.reported);
        if (!body) return this.invalidateDecision(memory);
        this.moveTowards(bot, memory, body, deltaTime);
        if (this.distance(bot, body) <= 140) {
          this.gameEngine.reportBody(bot.id, body.id);
          this.invalidateDecision(memory);
        }
        return;
      }
      case 'FIX_SABOTAGE':
        this.executeSabotageFix(bot, memory, deltaTime);
        return;
      case 'SABOTAGE':
        if (bot.role === 'IMPOSTOR' && decision.sabotageType !== 'NONE') {
          this.gameEngine.triggerSabotage(bot.id, decision.sabotageType);
        }
        this.invalidateDecision(memory);
        return;
      case 'WAIT':
      default:
        bot.vx = 0;
        bot.vy = 0;
    }
  }

  private executeTask(bot: GamePlayer, memory: BotMemory, targetId: string, deltaTime: number): void {
    if (bot.role !== 'CREWMATE') return this.invalidateDecision(memory);
    const task = bot.tasks.find(candidate =>
      !candidate.completed && (candidate.id === targetId || candidate.definitionId === targetId)
    ) ?? bot.tasks.find(candidate => !candidate.completed);
    if (!task) return this.invalidateDecision(memory);

    if (this.distance(bot, task) > 55) {
      memory.taskTimer = 0;
      this.moveTowards(bot, memory, task, deltaTime);
      return;
    }

    bot.vx = 0;
    bot.vy = 0;
    memory.taskTimer += deltaTime;
    if (memory.taskTimer >= 2.5) {
      this.gameEngine.completeTask(bot.id, task.id);
      this.invalidateDecision(memory);
    }
  }

  private executeSabotageFix(bot: GamePlayer, memory: BotMemory, deltaTime: number): void {
    if (bot.role !== 'CREWMATE' || !this.gameEngine.sabotage.activeType) {
      return this.invalidateDecision(memory);
    }

    const candidates = this.sabotageNodesForCurrentType()
      .filter(node => !this.gameEngine.sabotage.resolvedNodes.includes(node.id));
    const node = candidates.sort((a, b) => this.distance(bot, a) - this.distance(bot, b))[0];
    if (!node) return this.invalidateDecision(memory);

    this.moveTowards(bot, memory, node, deltaTime);
    if (this.distance(bot, node) <= 65) {
      this.gameEngine.resolveSabotageNode(bot.id, node.id);
      this.invalidateDecision(memory);
    }
  }

  private async sendAIChat(bot: GamePlayer, memory: BotMemory, reaction?: string): Promise<void> {
    if (bot.state !== 'ALIVE' || this.gameEngine.phase !== 'MEETING' || !this.gameEngine.meetingState) return;
    if (!reaction && memory.chatCount >= 2) return;
    if (!reaction) memory.chatCount++;

    const message = await this.ai.createChat(this.buildContext(bot, memory, true), reaction);
    if (
      message &&
      this.gameEngine.phase === 'MEETING' &&
      this.gameEngine.meetingState &&
      bot.state === 'ALIVE'
    ) {
      this.gameEngine.sendChatMessage(bot.id, message);
    }
  }

  private async castAIVote(bot: GamePlayer): Promise<void> {
    if (this.gameEngine.phase !== 'MEETING' || !this.gameEngine.meetingState || bot.state !== 'ALIVE') return;
    const memory = this.getMemory(bot.id);
    const eligible = Array.from(this.gameEngine.players.values())
      .filter(player => player.state === 'ALIVE' && player.id !== bot.id)
      .map(player => player.id);
    eligible.push('SKIP');

    const targetId = await this.ai.chooseVote(this.buildContext(bot, memory, true), eligible);
    if (this.gameEngine.phase !== 'MEETING' || !this.gameEngine.meetingState) return;
    this.gameEngine.castVote(bot.id, targetId && eligible.includes(targetId) ? targetId : 'SKIP');
  }

  private buildContext(bot: GamePlayer, memory: BotMemory, includeChat: boolean): string {
    const now = Date.now();
    const visiblePlayers = Array.from(this.gameEngine.players.values())
      .filter(player => player.id !== bot.id && player.state === 'ALIVE')
      .map(player => ({
        id: player.id,
        name: player.name,
        state: player.state,
        distance: Math.round(this.distance(bot, player)),
        lastSeen: memory.seenPlayers.get(player.id) ?? null,
        knownAlly: bot.role === 'IMPOSTOR' && player.role === 'IMPOSTOR'
      }));
    const visibleBodies = this.gameEngine.bodies
      .filter(body => !body.reported && (this.distance(bot, body) <= 320 || memory.seenBodies.has(body.id)))
      .map(body => ({ id: body.id, victim: body.victimName, distance: Math.round(this.distance(bot, body)) }));
    const tasks = bot.role === 'CREWMATE'
      ? bot.tasks.map(task => ({
        id: task.id,
        type: task.type,
        room: task.roomName,
        completed: task.completed
      }))
      : [];
    const chat = includeChat
      ? this.gameEngine.chatMessages.slice(-12).map(message => `${message.senderName}: ${message.text}`)
      : [];

    return JSON.stringify({
      self: {
        id: bot.id,
        name: bot.name,
        secretRole: bot.role,
        personality: memory.personality,
        room: memory.currentRoomName,
        previousRoom: memory.previousRoom,
        killReady: bot.role === 'IMPOSTOR' && bot.killCooldownRemaining <= 0,
        sabotageReady: bot.role === 'IMPOSTOR' && bot.sabotageCooldownRemaining <= 0
      },
      phase: this.gameEngine.phase,
      meeting: this.gameEngine.meetingState
        ? { reporter: this.gameEngine.meetingState.callerName, phase: this.gameEngine.meetingState.phase }
        : null,
      sabotage: this.gameEngine.sabotage.activeType,
      players: visiblePlayers,
      bodies: visibleBodies,
      tasks,
      recentChat: chat,
      observedAt: now
    });
  }

  private validWorldTargets(bot: GamePlayer, memory: BotMemory): string[] {
    const targets = new Set<string>(ROOMS.map(room => room.id));
    for (const player of this.gameEngine.players.values()) {
      if (player.id !== bot.id && player.state === 'ALIVE') targets.add(player.id);
    }
    if (bot.role === 'CREWMATE') {
      bot.tasks.filter(task => !task.completed).forEach(task => targets.add(task.id));
    }
    this.gameEngine.bodies
      .filter(body => !body.reported && (this.distance(bot, body) <= 320 || memory.seenBodies.has(body.id)))
      .forEach(body => targets.add(body.id));
    return Array.from(targets);
  }

  private isDecisionAllowed(
    bot: GamePlayer,
    decision: BotActionDecision,
    validTargets: string[]
  ): boolean {
    if (decision.target && !validTargets.includes(decision.target)) return false;
    const crewOnly: BotWorldAction[] = ['DO_TASK', 'FIX_SABOTAGE'];
    const impostorOnly: BotWorldAction[] = ['HUNT_PLAYER', 'SABOTAGE'];
    if (crewOnly.includes(decision.action) && bot.role !== 'CREWMATE') return false;
    if (impostorOnly.includes(decision.action) && bot.role !== 'IMPOSTOR') return false;
    return true;
  }

  private safeOfflineMovement(bot: GamePlayer): BotActionDecision {
    if (bot.role === 'CREWMATE') {
      const task = bot.tasks.find(candidate => !candidate.completed);
      if (task) return { action: 'DO_TASK', target: task.id, sabotageType: 'NONE' };
    }
    const roomIndex = Math.abs(this.hash(`${bot.id}:${Math.floor(Date.now() / 10000)}`)) % ROOMS.length;
    return { action: 'GO_ROOM', target: ROOMS[roomIndex].id, sabotageType: 'NONE' };
  }

  private moveTowards(bot: GamePlayer, memory: BotMemory, target: Vector2D, deltaTime: number): void {
    if (
      !memory.pathTarget ||
      this.distance(memory.pathTarget, target) > 35 ||
      memory.currentPath.length === 0
    ) {
      memory.pathTarget = { x: target.x, y: target.y };
      memory.currentPath = findAStarPath(bot, target);
      memory.pathIndex = 0;
    }

    let waypoint = memory.currentPath[memory.pathIndex] ?? target;
    // Doorways are 70-140 px wide. Reaching their center closely before
    // advancing prevents bots from clipping the jamb on a diagonal.
    if (this.distance(bot, waypoint) < 10 && memory.pathIndex < memory.currentPath.length - 1) {
      memory.pathIndex++;
      waypoint = memory.currentPath[memory.pathIndex] ?? target;
    }

    const dx = waypoint.x - bot.x;
    const dy = waypoint.y - bot.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) {
      bot.vx = 0;
      bot.vy = 0;
      return;
    }

    const speed = 160 * this.gameEngine.settings.playerSpeed;
    bot.vx = dx / distance * speed;
    bot.vy = dy / distance * speed;
    bot.facing = dx < 0 ? 'LEFT' : 'RIGHT';
    const requestedPosition = {
      x: Math.max(26, Math.min(MAP_BOUNDS.width - 26, bot.x + bot.vx * deltaTime)),
      y: Math.max(26, Math.min(MAP_BOUNDS.height - 26, bot.y + bot.vy * deltaTime))
    };
    const next = bot.state === 'ALIVE'
      ? clampPosition(bot, requestedPosition)
      : clampGhostPosition(requestedPosition);
    bot.x = next.x;
    bot.y = next.y;
  }

  private updateRoom(bot: GamePlayer, memory: BotMemory): void {
    const room = ROOMS.find(candidate =>
      bot.x >= candidate.x &&
      bot.x <= candidate.x + candidate.width &&
      bot.y >= candidate.y &&
      bot.y <= candidate.y + candidate.height
    );
    if (room && room.name !== memory.currentRoomName) {
      memory.previousRoom = memory.currentRoomName;
      memory.currentRoomName = room.name;
    }
  }

  private updateVision(bot: GamePlayer, memory: BotMemory): void {
    for (const player of this.gameEngine.players.values()) {
      if (player.id !== bot.id && player.state === 'ALIVE' && !player.inVent && this.distance(bot, player) <= 300) {
        memory.seenPlayers.set(player.id, {
          name: player.name,
          room: memory.currentRoomName,
          time: Date.now()
        });
      }
    }
    for (const body of this.gameEngine.bodies) {
      if (!body.reported && this.distance(bot, body) <= 300 && !memory.seenBodies.has(body.id)) {
        memory.seenBodies.add(body.id);
        memory.nextDecisionAt = 0;
      }
    }
  }

  private sabotageNodesForCurrentType(): Array<{ id: string; x: number; y: number }> {
    switch (this.gameEngine.sabotage.activeType) {
      case 'LIGHTS':
        return [{ id: 'LIGHTS_BREAKER', ...SABOTAGE_NODES.LIGHTS_BREAKER }];
      case 'REACTOR':
        return [
          { id: 'REACTOR_PAD_1', ...SABOTAGE_NODES.REACTOR_PAD_1 },
          { id: 'REACTOR_PAD_2', ...SABOTAGE_NODES.REACTOR_PAD_2 }
        ];
      case 'O2':
        return [
          { id: 'O2_KEYPAD_1', ...SABOTAGE_NODES.O2_KEYPAD_1 },
          { id: 'O2_KEYPAD_2', ...SABOTAGE_NODES.O2_KEYPAD_2 }
        ];
      default:
        return [];
    }
  }

  private invalidateDecision(memory: BotMemory): void {
    memory.decision = null;
    memory.nextDecisionAt = 0;
    memory.taskTimer = 0;
    memory.pathTarget = null;
    memory.currentPath = [];
    memory.pathIndex = 0;
  }

  private getMemory(botId: string): BotMemory {
    if (!this.memories.has(botId)) this.initBot(botId);
    return this.memories.get(botId)!;
  }

  private mentionsPlayer(text: string, playerName: string): boolean {
    const normalize = (value: string) => value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
    const escapedName = normalize(playerName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapedName}(?=$|[^\\p{L}\\p{N}_])`, 'u')
      .test(normalize(text));
  }

  private distance(a: Vector2D, b: Vector2D): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private hash(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return hash;
  }
}
