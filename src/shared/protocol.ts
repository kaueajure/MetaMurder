import { 
  GameSettings, 
  PlayerPublicData, 
  PlayerPrivateData, 
  GamePhase, 
  MeetingState, 
  SabotageState, 
  DeadBody, 
  ChatMessage, 
  RoomSummary,
  PlayerCustomization,
  TaskType,
  SabotageType
} from './types';

export const SOCKET_EVENTS = {
  // Client -> Server
  C2S_AUTHENTICATE: 'c2s_authenticate',
  C2S_GET_ROOMS: 'c2s_get_rooms',
  C2S_CREATE_ROOM: 'c2s_create_room',
  C2S_JOIN_ROOM: 'c2s_join_room',
  C2S_LEAVE_ROOM: 'c2s_leave_room',
  C2S_TOGGLE_READY: 'c2s_toggle_ready',
  C2S_UPDATE_SETTINGS: 'c2s_update_settings',
  C2S_UPDATE_CUSTOMIZATION: 'c2s_update_customization',
  C2S_START_GAME: 'c2s_start_game',
  C2S_KICK_PLAYER: 'c2s_kick_player',
  C2S_ADD_BOT: 'c2s_add_bot',
  C2S_REMOVE_BOT: 'c2s_remove_bot',
  C2S_RECONNECT: 'c2s_reconnect',
  
  // Game Actions Client -> Server
  C2S_MOVE: 'c2s_move',
  C2S_KILL: 'c2s_kill',
  C2S_REPORT_BODY: 'c2s_report_body',
  C2S_CALL_MEETING: 'c2s_call_meeting',
  C2S_VENT: 'c2s_vent',
  C2S_COMPLETE_TASK: 'c2s_complete_task',
  C2S_TRIGGER_SABOTAGE: 'c2s_trigger_sabotage',
  C2S_RESOLVE_SABOTAGE_NODE: 'c2s_resolve_sabotage_node',
  C2S_CAST_VOTE: 'c2s_cast_vote',
  C2S_SEND_CHAT: 'c2s_send_chat',

  // Server -> Client
  S2C_ROOM_LIST: 's2c_room_list',
  S2C_ROOM_JOINED: 's2c_room_joined',
  S2C_ROOM_UPDATED: 's2c_room_updated',
  S2C_GAME_STARTED: 's2c_game_started',
  S2C_GAME_STATE: 's2c_game_state',
  S2C_MEETING_STARTED: 's2c_meeting_started',
  S2C_MEETING_UPDATED: 's2c_meeting_updated',
  S2C_MEETING_ENDED: 's2c_meeting_ended',
  S2C_CHAT_MESSAGE: 's2c_chat_message',
  S2C_GAME_OVER: 's2c_game_over',
  S2C_RECONNECTED: 's2c_reconnected',
  S2C_ERROR: 's2c_error'
} as const;

export interface C2SMovePayload {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'LEFT' | 'RIGHT';
}

export interface S2CGameStatePayload {
  phase: GamePhase;
  players: PlayerPublicData[];
  self: PlayerPrivateData;
  bodies: DeadBody[];
  sabotage: SabotageState;
  totalTaskCount: number;
  completedTaskCount: number;
  meeting?: MeetingState | null;
  chat?: ChatMessage[];
}

export interface S2CGameOverPayload {
  winner: 'CREWMATES' | 'IMPOSTORS';
  reason: string;
  impostorIds: string[];
}
