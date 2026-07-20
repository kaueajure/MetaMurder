import { TaskDefinition, Vent, Vector2D } from './types';

export interface RoomRect {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const MAP_BOUNDS = {
  width: 2000,
  height: 1200
};

export const EMERGENCY_BUTTON_POS: Vector2D = {
  x: 1000,
  y: 500
};

export const SPAWN_POINTS: Vector2D[] = [
  { x: 960, y: 460 },
  { x: 1040, y: 460 },
  { x: 960, y: 540 },
  { x: 1040, y: 540 },
  { x: 920, y: 500 },
  { x: 1080, y: 500 },
  { x: 1000, y: 440 },
  { x: 1000, y: 560 },
  { x: 940, y: 520 },
  { x: 1060, y: 520 }
];

export const ROOMS: RoomRect[] = [
  { id: 'CAFETERIA', name: 'Refeitório', x: 800, y: 350, width: 400, height: 300, color: '#1E293B' },
  { id: 'NAVIGATION', name: 'Navegação', x: 1450, y: 380, width: 300, height: 240, color: '#0F172A' },
  { id: 'ELECTRICAL', name: 'Elétrica', x: 450, y: 750, width: 300, height: 260, color: '#1E1B4B' },
  { id: 'REACTOR', name: 'Reator', x: 150, y: 350, width: 280, height: 280, color: '#312E81' },
  { id: 'MEDBAY', name: 'Enfermaria', x: 500, y: 220, width: 240, height: 200, color: '#064E3B' },
  { id: 'SECURITY', name: 'Segurança', x: 250, y: 650, width: 200, height: 200, color: '#4C1D95' },
  { id: 'STORAGE', name: 'Armazém', x: 850, y: 750, width: 350, height: 300, color: '#3F6212' },
  { id: 'UPPER_ENGINE', name: 'Motor Superior', x: 480, y: 80, width: 260, height: 180, color: '#701A75' },
  { id: 'LOWER_ENGINE', name: 'Motor Inferior', x: 480, y: 1020, width: 260, height: 160, color: '#701A75' }
];

// Walls defined as collision line segments bounding the station layout
export const MAP_WALLS: WallSegment[] = [
  // Outer perimeter & room borders
  // Cafeteria
  { x1: 800, y1: 350, x2: 1200, y2: 350 },
  { x1: 1200, y1: 350, x2: 1200, y2: 440 }, // top right hallway opening
  { x1: 1200, y1: 560, x2: 1200, y2: 650 },
  { x1: 1200, y1: 650, x2: 800, y2: 650 },
  { x1: 800, y1: 650, x2: 800, y2: 560 },
  { x1: 800, y1: 440, x2: 800, y2: 350 },

  // East Corridor to Navigation
  { x1: 1200, y1: 440, x2: 1450, y2: 440 },
  { x1: 1200, y1: 560, x2: 1450, y2: 560 },

  // Navigation
  { x1: 1450, y1: 380, x2: 1750, y2: 380 },
  { x1: 1750, y1: 380, x2: 1750, y2: 620 },
  { x1: 1750, y1: 620, x2: 1450, y2: 620 },
  { x1: 1450, y1: 620, x2: 1450, y2: 560 },
  { x1: 1450, y1: 440, x2: 1450, y2: 380 },

  // South Corridor to Storage
  { x1: 940, y1: 650, x2: 940, y2: 750 },
  { x1: 1060, y1: 650, x2: 1060, y2: 750 },

  // Storage
  { x1: 850, y1: 750, x2: 1200, y2: 750 },
  { x1: 1200, y1: 750, x2: 1200, y2: 1050 },
  { x1: 1200, y1: 1050, x2: 850, y2: 1050 },
  { x1: 850, y1: 1050, x2: 850, y2: 750 },

  // West Corridor to Electrical & Security
  { x1: 800, y1: 500, x2: 600, y2: 500 },
  { x1: 600, y1: 500, x2: 600, y2: 750 },

  // Electrical
  { x1: 450, y1: 750, x2: 750, y2: 750 },
  { x1: 750, y1: 750, x2: 750, y2: 1010 },
  { x1: 750, y1: 1010, x2: 450, y2: 1010 },
  { x1: 450, y1: 1010, x2: 450, y2: 750 },

  // Reactor
  { x1: 150, y1: 350, x2: 430, y2: 350 },
  { x1: 430, y1: 350, x2: 430, y2: 630 },
  { x1: 430, y1: 630, x2: 150, y2: 630 },
  { x1: 150, y1: 630, x2: 150, y2: 350 },

  // MedBay
  { x1: 500, y1: 220, x2: 740, y2: 220 },
  { x1: 740, y1: 220, x2: 740, y2: 420 },
  { x1: 740, y1: 420, x2: 500, y2: 420 },
  { x1: 500, y1: 420, x2: 500, y2: 220 }
];

export const TASK_DEFINITIONS: TaskDefinition[] = [
  { id: 'task_elec_wiring', roomId: 'ELECTRICAL', roomName: 'Elétrica', type: 'WIRING', x: 500, y: 780, length: 'SHORT' },
  { id: 'task_elec_switches', roomId: 'ELECTRICAL', roomName: 'Elétrica', type: 'SWITCHES', x: 700, y: 820, length: 'SHORT' },
  { id: 'task_elec_calibrate', roomId: 'ELECTRICAL', roomName: 'Elétrica', type: 'CALIBRATE', x: 620, y: 960, length: 'LONG' },
  
  { id: 'task_nav_wiring', roomId: 'NAVIGATION', roomName: 'Navegação', type: 'WIRING', x: 1700, y: 420, length: 'SHORT' },
  { id: 'task_nav_download', roomId: 'NAVIGATION', roomName: 'Navegação', type: 'DOWNLOAD', x: 1500, y: 580, length: 'LONG' },
  { id: 'task_nav_keypad', roomId: 'NAVIGATION', roomName: 'Navegação', type: 'KEYPAD', x: 1650, y: 580, length: 'SHORT' },

  { id: 'task_caf_keypad', roomId: 'CAFETERIA', roomName: 'Refeitório', type: 'KEYPAD', x: 1150, y: 380, length: 'SHORT' },
  { id: 'task_caf_wiring', roomId: 'CAFETERIA', roomName: 'Refeitório', type: 'WIRING', x: 840, y: 600, length: 'SHORT' },

  { id: 'task_react_simon', roomId: 'REACTOR', roomName: 'Reator', type: 'SIMON', x: 200, y: 400, length: 'LONG' },
  { id: 'task_react_calibrate', roomId: 'REACTOR', roomName: 'Reator', type: 'CALIBRATE', x: 380, y: 550, length: 'SHORT' },

  { id: 'task_stor_refill', roomId: 'STORAGE', roomName: 'Armazém', type: 'REFILL', x: 900, y: 1000, length: 'LONG' },
  { id: 'task_stor_wiring', roomId: 'STORAGE', roomName: 'Armazém', type: 'WIRING', x: 1150, y: 800, length: 'SHORT' },

  { id: 'task_med_download', roomId: 'MEDBAY', roomName: 'Enfermaria', type: 'DOWNLOAD', x: 550, y: 250, length: 'SHORT' },
  { id: 'task_sec_switches', roomId: 'SECURITY', roomName: 'Segurança', type: 'SWITCHES', x: 290, y: 680, length: 'SHORT' }
];

export const VENTS: Vent[] = [
  { id: 'vent_elec', roomId: 'ELECTRICAL', x: 480, y: 980, connectsTo: ['vent_sec', 'vent_med'] },
  { id: 'vent_sec', roomId: 'SECURITY', x: 280, y: 800, connectsTo: ['vent_elec', 'vent_med'] },
  { id: 'vent_med', roomId: 'MEDBAY', x: 700, y: 380, connectsTo: ['vent_elec', 'vent_sec'] },
  { id: 'vent_react', roomId: 'REACTOR', x: 180, y: 600, connectsTo: ['vent_upeng'] },
  { id: 'vent_upeng', roomId: 'UPPER_ENGINE', x: 520, y: 140, connectsTo: ['vent_react'] },
  { id: 'vent_nav', roomId: 'NAVIGATION', x: 1710, y: 590, connectsTo: ['vent_caf'] },
  { id: 'vent_caf', roomId: 'CAFETERIA', x: 1160, y: 610, connectsTo: ['vent_nav'] }
];

export const SABOTAGE_NODES = {
  LIGHTS_BREAKER: { x: 580, y: 980, roomId: 'ELECTRICAL', roomName: 'Elétrica' },
  REACTOR_PAD_1: { x: 220, y: 380, roomId: 'REACTOR', roomName: 'Reator Pad 1' },
  REACTOR_PAD_2: { x: 380, y: 380, roomId: 'REACTOR', roomName: 'Reator Pad 2' },
  O2_KEYPAD_1: { x: 1150, y: 400, roomId: 'CAFETERIA', roomName: 'Refeitório O2' },
  O2_KEYPAD_2: { x: 1550, y: 400, roomId: 'NAVIGATION', roomName: 'Navegação O2' }
};
