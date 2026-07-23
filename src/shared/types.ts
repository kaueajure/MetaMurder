export type PlayerRole = 'CREWMATE' | 'IMPOSTOR';

export type PlayerState = 'ALIVE' | 'DEAD' | 'GHOST';

export type BotDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface Vector2D {
  x: number;
  y: number;
}

export interface CosmeticItem {
  id: string;
  name: string;
  type: 'HAT' | 'SKIN' | 'PET';
  color?: string;
  iconSvg?: string;
}

export interface PlayerCustomization {
  color: string;
  hatId: string;
  skinId: string;
}

export interface GameSettings {
  maxPlayers: number;
  impostorCount: number;
  playerSpeed: number; // multiplier, e.g. 1.0
  crewmateVision: number; // distance in px, e.g. 250
  impostorVision: number; // e.g. 350
  killCooldown: number; // seconds, e.g. 25
  killDistance: 'SHORT' | 'MEDIUM' | 'LONG';
  discussionTime: number; // seconds, e.g. 15
  votingTime: number; // seconds, e.g. 30
  emergencyMeetingsPerPlayer: number; // e.g. 1
  emergencyCooldown: number; // seconds, e.g. 20
  confirmEjects: boolean;
  taskCountShort: number;
  taskCountLong: number;
  botCount: number;
  botDifficulty: BotDifficulty;
  isPrivate: boolean;
}

export type TaskType = 
  | 'WIRING' 
  | 'KEYPAD' 
  | 'CALIBRATE' 
  | 'DOWNLOAD' 
  | 'SIMON' 
  | 'REFILL' 
  | 'SWITCHES';

export interface TaskDefinition {
  id: string;
  roomId: string;
  roomName: string;
  type: TaskType;
  x: number;
  y: number;
  length: 'SHORT' | 'LONG';
}

export interface PlayerTask {
  id: string;
  definitionId: string;
  type: TaskType;
  roomName: string;
  x: number;
  y: number;
  completed: boolean;
}

export type SabotageType = 'LIGHTS' | 'REACTOR' | 'O2' | 'COMMS' | 'DOORS_CAFETERIA' | 'DOORS_ELECTRICAL' | 'DOORS_REACTOR';

export interface SabotageState {
  activeType: SabotageType | null;
  timer: number; // remaining seconds for critical sabotages
  durationMax: number;
  resolvedNodes: string[]; // e.g. ['pad1', 'pad2']
  doorsLocked: { [roomId: string]: number }; // remaining locked seconds
  cooldown: number; // imposter sabotage cooldown
}

export interface DeadBody {
  id: string;
  victimId: string;
  victimName: string;
  victimColor: string;
  x: number;
  y: number;
  reported: boolean;
}

export interface Vent {
  id: string;
  roomId: string;
  x: number;
  y: number;
  connectsTo: string[]; // IDs of connected vents
}

export interface PlayerPublicData {
  id: string;
  name: string;
  isBot: boolean;
  color: string;
  hatId: string;
  skinId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'LEFT' | 'RIGHT';
  state: PlayerState;
  isReady: boolean;
  isHost: boolean;
  inVent: boolean;
  currentVentId: string | null;
}

export interface PlayerPrivateData extends PlayerPublicData {
  role: PlayerRole;
  tasks: PlayerTask[];
  killCooldownRemaining: number;
  sabotageCooldownRemaining: number;
}

export type GamePhase = 'LOBBY' | 'PLAYING' | 'MEETING' | 'EJECTION' | 'GAME_OVER';

export interface MeetingState {
  callerId: string;
  callerName: string;
  bodyId: string | null; // null if emergency meeting
  reason: 'BODY';
  phase: 'DISCUSSION' | 'VOTING' | 'RESULT';
  timer: number; // remaining seconds
  votes: { [voterId: string]: string }; // voterId -> targetPlayerId (or 'SKIP')
  hasVoted: { [playerId: string]: boolean };
  ejectedPlayerId: string | null;
  ejectedPlayerName: string | null;
  wasImpostor: boolean | null;
  tie: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isGhostOnly: boolean;
  isSystem: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  isGuest: boolean;
  equippedColor: string;
  equippedHat: string;
  equippedSkin: string;
  stats: {
    gamesPlayed: number;
    crewmateWins: number;
    impostorWins: number;
    kills: number;
    tasksCompleted: number;
    correctVotes: number;
  };
}

export interface RoomSummary {
  code: string;
  name: string;
  hostName: string;
  players: Array<{
    id: string;
    name: string;
    isBot: boolean;
    color: string;
    hatId: string;
    skinId: string;
    isHost: boolean;
    isReady: boolean;
  }>;
  playerCount: number;
  maxPlayers: number;
  impostorCount: number;
  isPrivate: boolean;
  inGame: boolean;
}
