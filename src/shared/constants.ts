import { GameSettings } from './types';

export const PLAYER_COLORS = [
  { id: 'RED', name: 'Vermelho', hex: '#EF4444', darkHex: '#991B1B' },
  { id: 'BLUE', name: 'Azul', hex: '#3B82F6', darkHex: '#1E40AF' },
  { id: 'GREEN', name: 'Verde', hex: '#10B981', darkHex: '#065F46' },
  { id: 'PINK', name: 'Rosa', hex: '#EC4899', darkHex: '#9D174D' },
  { id: 'ORANGE', name: 'Laranja', hex: '#F97316', darkHex: '#9A3412' },
  { id: 'YELLOW', name: 'Amarelo', hex: '#EAB308', darkHex: '#854D0E' },
  { id: 'PURPLE', name: 'Roxo', hex: '#A855F7', darkHex: '#6B21A8' },
  { id: 'CYAN', name: 'Ciano', hex: '#06B6D4', darkHex: '#155E75' },
  { id: 'WHITE', name: 'Branco', hex: '#F8FAFC', darkHex: '#64748B' },
  { id: 'BLACK', name: 'Preto', hex: '#334155', darkHex: '#0F172A' },
  { id: 'LIME', name: 'Lima', hex: '#84CC16', darkHex: '#3F6212' },
  { id: 'BROWN', name: 'Marrom', hex: '#8B4513', darkHex: '#54280B' }
];

export const HATS = [
  { id: 'NONE', name: 'Nenhum' },
  { id: 'CAPTAIN_HAT', name: 'Quepe de Capitão' },
  { id: 'CROWN', name: 'Coroa Imponderável' },
  { id: 'VR_GOGGLES', name: 'Óculos VR Cyber' },
  { id: 'VIKING_HELMET', name: 'Capacete Viking' },
  { id: 'ANTENNA', name: 'Antena Alien' },
  { id: 'HEADPHONES', name: 'Fones Gamer' },
  { id: 'CAT_EARS', name: 'Orelhas de Gato' }
];

export const SKINS = [
  { id: 'DEFAULT', name: 'Traje Padrão' },
  { id: 'CYBER_ARMOR', name: 'Traje Cibernético' },
  { id: 'LAB_COAT', name: 'Jaleco Científico' },
  { id: 'STEALTH_SUIT', name: 'Traje Furtivo' }
];

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxPlayers: 10,
  impostorCount: 2,
  playerSpeed: 1.0,
  crewmateVision: 260,
  impostorVision: 360,
  killCooldown: 20,
  killDistance: 'MEDIUM',
  discussionTime: 15,
  votingTime: 30,
  emergencyMeetingsPerPlayer: 1,
  emergencyCooldown: 15,
  confirmEjects: true,
  taskCountShort: 3,
  taskCountLong: 2,
  botCount: 4,
  botDifficulty: 'NORMAL',
  isPrivate: false
};

export const KILL_DISTANCES = {
  SHORT: 60,
  MEDIUM: 95,
  LONG: 140
};

export const INTERACTION_DISTANCE = 80;
export const BASE_PLAYER_SPEED = 180; // px/sec
export const TICK_RATE = 20; // 20 updates per sec (50ms interval)
export const BOT_NAMES = [
  'Bot-Alpha', 'Bot-Beta', 'Bot-Gamma', 'Bot-Delta',
  'Bot-Epsilon', 'Bot-Zeta', 'Bot-Eta', 'Bot-Theta'
];
