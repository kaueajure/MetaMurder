import { 
  GameSettings, 
  PlayerRole, 
  PlayerState, 
  GamePhase, 
  MeetingState, 
  SabotageState, 
  DeadBody, 
  ChatMessage, 
  PlayerPublicData, 
  PlayerPrivateData, 
  PlayerTask,
  TaskType,
  SabotageType
} from '../shared/types';
import { TASK_DEFINITIONS, SPAWN_POINTS, EMERGENCY_BUTTON_POS, SABOTAGE_NODES } from '../shared/mapData';
import { TICK_RATE, KILL_DISTANCES } from '../shared/constants';
import { clampPosition, hasLineOfSight } from './mapCollision';
import { BotEngine } from './botEngine';
import { RoomPlayer } from './roomManager';
import { sanitizeChatMessage } from './chatFilter';
import { recordGameStats } from './db';

export interface GamePlayer extends PlayerPrivateData {
  socketId: string | null;
  isBot: boolean;
}

export class GameEngine {
  public roomCode: string;
  public settings: GameSettings;
  public phase: GamePhase = 'PLAYING';
  public players: Map<string, GamePlayer> = new Map();
  public bodies: DeadBody[] = [];
  public sabotage: SabotageState;
  public meetingState: MeetingState | null = null;
  public chatMessages: ChatMessage[] = [];
  
  private botEngine: BotEngine;
  private tickInterval: NodeJS.Timeout | null = null;
  private onStateUpdate: () => void;
  private onGameOver: (winner: 'CREWMATES' | 'IMPOSTORS', reason: string) => void;

  constructor(
    roomCode: string, 
    settings: GameSettings, 
    roomPlayers: Map<string, RoomPlayer>,
    onStateUpdate: () => void,
    onGameOver: (winner: 'CREWMATES' | 'IMPOSTORS', reason: string) => void
  ) {
    this.roomCode = roomCode;
    this.settings = settings;
    this.botEngine = new BotEngine(this);
    this.onStateUpdate = onStateUpdate;
    this.onGameOver = onGameOver;

    this.sabotage = {
      activeType: null,
      timer: 0,
      durationMax: 30,
      resolvedNodes: [],
      doorsLocked: {},
      cooldown: 15
    };

    this.initPlayers(roomPlayers);
  }

  private initPlayers(roomPlayers: Map<string, RoomPlayer>): void {
    const playerArray = Array.from(roomPlayers.values());
    const count = playerArray.length;

    // Secret role assignment
    const impostorCount = Math.min(this.settings.impostorCount, Math.floor(count / 2) || 1);
    const shuffled = [...playerArray].sort(() => Math.random() - 0.5);
    const impostorIds = new Set(shuffled.slice(0, impostorCount).map(p => p.id));

    shuffled.forEach((p, idx) => {
      const spawn = SPAWN_POINTS[idx % SPAWN_POINTS.length];
      const isImp = impostorIds.has(p.id);

      // Generate random task assignments for crewmates
      const tasks: PlayerTask[] = isImp ? [] : this.generateTasksForPlayer();

      const gamePlayer: GamePlayer = {
        id: p.id,
        socketId: p.socketId,
        name: p.name,
        isBot: p.isBot,
        color: p.color,
        hatId: p.hatId,
        skinId: p.skinId,
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        facing: 'RIGHT',
        state: 'ALIVE',
        isReady: true,
        isHost: p.isHost,
        inVent: false,
        currentVentId: null,
        role: isImp ? 'IMPOSTOR' : 'CREWMATE',
        tasks: tasks,
        killCooldownRemaining: this.settings.killCooldown,
        sabotageCooldownRemaining: 15
      };

      this.players.set(p.id, gamePlayer);
      if (p.isBot) {
        this.botEngine.initBot(p.id);
      }
    });
  }

  public start(): void {
    this.phase = 'PLAYING';
    const intervalMs = 1000 / TICK_RATE;

    this.tickInterval = setInterval(() => {
      this.tick(intervalMs / 1000);
    }, intervalMs);
  }

  public stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick(deltaTime: number): void {
    if (this.phase === 'GAME_OVER') return;

    if (this.phase === 'PLAYING') {
      // 1. Update Cooldowns & Timers
      this.players.forEach(p => {
        if (p.role === 'IMPOSTOR' && p.state === 'ALIVE') {
          p.killCooldownRemaining = Math.max(0, p.killCooldownRemaining - deltaTime);
          p.sabotageCooldownRemaining = Math.max(0, p.sabotageCooldownRemaining - deltaTime);
        }
      });

      // 2. Active Sabotage Timers
      if (this.sabotage.activeType === 'REACTOR' || this.sabotage.activeType === 'O2') {
        this.sabotage.timer -= deltaTime;
        if (this.sabotage.timer <= 0) {
          this.triggerGameOver('IMPOSTORS', 'A sabotagem crítica não foi resolvida a tempo!');
          return;
        }
      }

      // 3. Tick Bots
      this.players.forEach(p => {
        if (p.isBot) {
          this.botEngine.tick(p, deltaTime);
        }
      });

      // 4. Check Task Victory Condition
      this.checkTaskVictory();
    } else if (this.phase === 'MEETING' && this.meetingState) {
      // Meeting Timers
      this.meetingState.timer -= deltaTime;
      if (this.meetingState.timer <= 0) {
        if (this.meetingState.phase === 'DISCUSSION') {
          this.meetingState.phase = 'VOTING';
          this.meetingState.timer = this.settings.votingTime;

          // Trigger bot votes
          this.players.forEach(p => {
            if (p.isBot) this.botEngine.handleMeetingVoting(p);
          });
        } else if (this.meetingState.phase === 'VOTING') {
          this.finalizeVoting();
        } else if (this.meetingState.phase === 'RESULT') {
          this.endMeetingAndResume();
        }
      }
    }

    this.onStateUpdate();
  }

  // --- Actions ---

  public handlePlayerMove(playerId: string, x: number, y: number, vx: number, vy: number, facing: 'LEFT' | 'RIGHT'): void {
    const player = this.players.get(playerId);
    if (!player || player.state === 'DEAD' || this.phase !== 'PLAYING') return;

    // Validate speed to prevent speed hacks
    const maxSpeed = 220 * this.settings.playerSpeed;
    const speed = Math.sqrt(vx * vx + vy * vy);

    let validVx = vx;
    let validVy = vy;
    if (speed > maxSpeed) {
      validVx = (vx / speed) * maxSpeed;
      validVy = (vy / speed) * maxSpeed;
    }

    // Apply position clamp / wall collisions for ALIVE players
    if (player.state === 'ALIVE') {
      const targetPos = { x: player.x + validVx * 0.05, y: player.y + validVy * 0.05 };
      const clamped = clampPosition({ x: player.x, y: player.y }, targetPos);
      player.x = clamped.x;
      player.y = clamped.y;
    } else { // Ghosts can walk through walls
      player.x += validVx * 0.05;
      player.y += validVy * 0.05;
    }

    player.vx = validVx;
    player.vy = validVy;
    player.facing = facing;
  }

  public killPlayer(killerId: string, targetId: string): boolean {
    const killer = this.players.get(killerId);
    const target = this.players.get(targetId);

    if (!killer || !target) return false;
    if (killer.role !== 'IMPOSTOR' || killer.state !== 'ALIVE') return false;
    if (target.state !== 'ALIVE' || target.role === 'IMPOSTOR') return false;
    if (killer.killCooldownRemaining > 0 || this.phase !== 'PLAYING') return false;

    // Distance check
    const maxDist = KILL_DISTANCES[this.settings.killDistance];
    const dist = Math.sqrt(Math.pow(killer.x - target.x, 2) + Math.pow(killer.y - target.y, 2));
    if (dist > maxDist) return false;

    // Line of sight check
    if (!hasLineOfSight(killer, target)) return false;

    // Execute Kill
    target.state = 'DEAD';
    killer.killCooldownRemaining = this.settings.killCooldown;

    // Spawn Dead Body
    const body: DeadBody = {
      id: `body_${Date.now()}_${target.id}`,
      victimId: target.id,
      victimName: target.name,
      victimColor: target.color,
      x: target.x,
      y: target.y,
      reported: false
    };
    this.bodies.push(body);

    // Record stat
    recordGameStats(killerId, { kills: 1 });

    // Check Impostor Victory Condition
    this.checkImpostorVictory();

    return true;
  }

  public reportBody(reporterId: string, bodyId: string): boolean {
    const reporter = this.players.get(reporterId);
    const body = this.bodies.find(b => b.id === bodyId);

    if (!reporter || !body || body.reported) return false;
    if (reporter.state !== 'ALIVE' || this.phase !== 'PLAYING') return false;

    const dist = Math.sqrt(Math.pow(reporter.x - body.x, 2) + Math.pow(reporter.y - body.y, 2));
    if (dist > 150) return false;

    body.reported = true;
    this.bodies = this.bodies.filter(b => b.id !== bodyId); // Remove reported body from floor

    this.startMeeting(reporter, 'BODY', bodyId);
    return true;
  }

  public callEmergencyMeeting(callerId: string): boolean {
    const caller = this.players.get(callerId);
    if (!caller || caller.state !== 'ALIVE' || this.phase !== 'PLAYING') return false;
    if (this.sabotage.activeType === 'REACTOR' || this.sabotage.activeType === 'O2') return false; // Block during critical sabotages

    const dist = Math.sqrt(Math.pow(caller.x - EMERGENCY_BUTTON_POS.x, 2) + Math.pow(caller.y - EMERGENCY_BUTTON_POS.y, 2));
    if (dist > 100) return false;

    this.startMeeting(caller, 'EMERGENCY', null);
    return true;
  }

  private startMeeting(caller: GamePlayer, reason: 'BODY' | 'EMERGENCY', bodyId: string | null): void {
    this.phase = 'MEETING';
    
    // Teleport all living players back to cafeteria spawn
    let idx = 0;
    this.players.forEach(p => {
      const spawn = SPAWN_POINTS[idx % SPAWN_POINTS.length];
      p.x = spawn.x;
      p.y = spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.inVent = false;
      idx++;
    });

    this.meetingState = {
      callerId: caller.id,
      callerName: caller.name,
      bodyId: bodyId,
      reason: reason,
      phase: 'DISCUSSION',
      timer: this.settings.discussionTime,
      votes: {},
      hasVoted: {},
      ejectedPlayerId: null,
      ejectedPlayerName: null,
      wasImpostor: null,
      tie: false
    };

    // System chat broadcast
    const sysMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      senderId: 'SYSTEM',
      senderName: 'SISTEMA',
      senderColor: '#F59E0B',
      text: reason === 'BODY' ? `🚨 Corpo denunciado por ${caller.name}!` : `🔔 Reunião de emergência convocada por ${caller.name}!`,
      timestamp: Date.now(),
      isGhostOnly: false,
      isSystem: true
    };
    this.chatMessages.push(sysMsg);

    // Bot discussion routines
    this.players.forEach(p => {
      if (p.isBot) this.botEngine.handleMeetingDiscussion(p);
    });
  }

  public castVote(voterId: string, targetId: string): boolean {
    const voter = this.players.get(voterId);
    if (!voter || voter.state !== 'ALIVE' || !this.meetingState) return false;
    if (this.meetingState.hasVoted[voterId]) return false; // Duplicate vote prevention

    this.meetingState.votes[voterId] = targetId;
    this.meetingState.hasVoted[voterId] = true;

    // Check if all living players have voted
    const livingCount = Array.from(this.players.values()).filter(p => p.state === 'ALIVE').length;
    if (Object.keys(this.meetingState.votes).length >= livingCount) {
      this.finalizeVoting();
    }

    return true;
  }

  private finalizeVoting(): void {
    if (!this.meetingState) return;

    this.meetingState.phase = 'RESULT';
    this.meetingState.timer = 5; // 5 sec result display

    // Tabulate votes
    const tally: { [targetId: string]: number } = {};
    Object.values(this.meetingState.votes).forEach(target => {
      tally[target] = (tally[target] || 0) + 1;
    });

    let maxVotes = 0;
    let ejectedId: string | null = null;
    let isTie = false;

    Object.entries(tally).forEach(([target, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        ejectedId = target;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    });

    if (isTie || ejectedId === 'SKIP' || !ejectedId) {
      this.meetingState.ejectedPlayerId = null;
      this.meetingState.tie = isTie;
    } else {
      const ejectedPlayer = this.players.get(ejectedId);
      if (ejectedPlayer) {
        ejectedPlayer.state = 'DEAD';
        this.meetingState.ejectedPlayerId = ejectedId;
        this.meetingState.ejectedPlayerName = ejectedPlayer.name;
        this.meetingState.wasImpostor = ejectedPlayer.role === 'IMPOSTOR';

        // Check victory condition after ejection
        if (ejectedPlayer.role === 'IMPOSTOR') {
          const remainingImpostors = Array.from(this.players.values()).filter(p => p.state === 'ALIVE' && p.role === 'IMPOSTOR').length;
          if (remainingImpostors === 0) {
            this.triggerGameOver('CREWMATES', 'Todos os assassinos foram eliminados!');
            return;
          }
        }
        this.checkImpostorVictory();
      }
    }
  }

  private endMeetingAndResume(): void {
    this.meetingState = null;
    this.phase = 'PLAYING';
  }

  public completeTask(playerId: string, taskId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    const task = player.tasks.find(t => t.id === taskId);
    if (!task || task.completed) return false;

    task.completed = true;
    recordGameStats(playerId, { tasks: 1 });

    this.checkTaskVictory();
    return true;
  }

  public triggerSabotage(impostorId: string, type: SabotageType): boolean {
    const imp = this.players.get(impostorId);
    if (!imp || imp.role !== 'IMPOSTOR' || imp.state !== 'ALIVE') return false;
    if (imp.sabotageCooldownRemaining > 0 || this.sabotage.activeType !== null) return false;

    this.sabotage.activeType = type;
    this.sabotage.resolvedNodes = [];
    this.sabotage.timer = 30; // 30s critical timer

    // Apply 25s sabotage cooldown to all impostors
    this.players.forEach(p => {
      if (p.role === 'IMPOSTOR') p.sabotageCooldownRemaining = 25;
    });

    return true;
  }

  public resolveSabotageNode(playerId: string, nodeId: string): void {
    if (!this.sabotage.activeType) return;

    if (!this.sabotage.resolvedNodes.includes(nodeId)) {
      this.sabotage.resolvedNodes.push(nodeId);
    }

    // Check if fully resolved
    if (this.sabotage.activeType === 'LIGHTS' && this.sabotage.resolvedNodes.includes('LIGHTS_BREAKER')) {
      this.sabotage.activeType = null;
    } else if (this.sabotage.activeType === 'REACTOR' && this.sabotage.resolvedNodes.length >= 2) {
      this.sabotage.activeType = null;
    } else if (this.sabotage.activeType === 'O2' && this.sabotage.resolvedNodes.length >= 2) {
      this.sabotage.activeType = null;
    }
  }

  public useVent(impostorId: string, ventId: string): boolean {
    const imp = this.players.get(impostorId);
    if (!imp || imp.role !== 'IMPOSTOR' || imp.state !== 'ALIVE') return false;

    imp.inVent = !imp.inVent;
    imp.currentVentId = imp.inVent ? ventId : null;
    return true;
  }

  public sendChatMessage(senderId: string, text: string): void {
    const sender = this.players.get(senderId);
    if (!sender) return;

    const cleanText = sanitizeChatMessage(text);
    if (!cleanText) return;

    const isGhost = sender.state === 'DEAD' || sender.state === 'GHOST';

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: sender.id,
      senderName: sender.name,
      senderColor: sender.color,
      text: cleanText,
      timestamp: Date.now(),
      isGhostOnly: isGhost,
      isSystem: false
    };

    this.chatMessages.push(message);
  }

  public handlePlayerDisconnect(playerId: string): void {
    this.players.delete(playerId);
    if (this.phase === 'PLAYING') {
      this.checkImpostorVictory();
      this.checkTaskVictory();
    }
  }

  // --- Victory Helpers ---

  private checkTaskVictory(): void {
    let totalTasks = 0;
    let completedTasks = 0;

    this.players.forEach(p => {
      if (p.role === 'CREWMATE') {
        totalTasks += p.tasks.length;
        completedTasks += p.tasks.filter(t => t.completed).length;
      }
    });

    if (totalTasks > 0 && completedTasks >= totalTasks) {
      this.triggerGameOver('CREWMATES', 'Todas as tarefas foram concluídas!');
    }
  }

  private checkImpostorVictory(): void {
    const livingCrew = Array.from(this.players.values()).filter(p => p.state === 'ALIVE' && p.role === 'CREWMATE').length;
    const livingImps = Array.from(this.players.values()).filter(p => p.state === 'ALIVE' && p.role === 'IMPOSTOR').length;

    if (livingImps >= livingCrew && livingImps > 0) {
      this.triggerGameOver('IMPOSTORS', 'Os assassinos eliminaram tripulantes suficientes!');
    }
  }

  private triggerGameOver(winner: 'CREWMATES' | 'IMPOSTORS', reason: string): void {
    this.phase = 'GAME_OVER';
    this.stop();

    // Record stats
    this.players.forEach(p => {
      if (!p.isBot) {
        const isWinner = (winner === 'CREWMATES' && p.role === 'CREWMATE') || (winner === 'IMPOSTORS' && p.role === 'IMPOSTOR');
        recordGameStats(p.id, {
          crewWin: winner === 'CREWMATES' && p.role === 'CREWMATE',
          impWin: winner === 'IMPOSTORS' && p.role === 'IMPOSTOR'
        });
      }
    });

    this.onGameOver(winner, reason);
  }

  private generateTasksForPlayer(): PlayerTask[] {
    const shuffled = [...TASK_DEFINITIONS].sort(() => Math.random() - 0.5);
    const count = this.settings.taskCountShort + this.settings.taskCountLong;
    const selected = shuffled.slice(0, count);

    return selected.map((def, idx) => ({
      id: `task_${idx}_${def.id}`,
      definitionId: def.id,
      type: def.type,
      roomName: def.roomName,
      x: def.x,
      y: def.y,
      completed: false
    }));
  }
}
