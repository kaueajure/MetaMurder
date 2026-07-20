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

// ============================================================
//  ROOM LAYOUT - "Orbital Station Zero"
//
//  Simplified & fully connected layout:
//
//  Row 1 (top):    [Upper Engine] ---corridor--- [MedBay]
//                         |                         |
//  Row 2 (mid):    [Reactor] ---[Security]--- [Cafeteria] ---corridor--- [Navigation]
//                                   |              |
//  Row 3 (bot):    [Lower Engine] ---corridor--- [Electrical] --- [Storage]
//
//  All rooms are connected via wide corridors with 80px doorway openings.
// ============================================================

export const ROOMS: RoomRect[] = [
  // Central hub
  { id: 'CAFETERIA',    name: 'Refeitório',      x: 800,  y: 350, width: 400, height: 300, color: '#1a2744' },
  // Right wing
  { id: 'NAVIGATION',   name: 'Navegação',       x: 1400, y: 400, width: 280, height: 200, color: '#142238' },
  // Left wing - top
  { id: 'UPPER_ENGINE', name: 'Motor Superior',   x: 200,  y: 100, width: 250, height: 200, color: '#2d1a4e' },
  { id: 'MEDBAY',       name: 'Enfermaria',       x: 550,  y: 100, width: 250, height: 200, color: '#0c3a2a' },
  // Left wing - middle
  { id: 'REACTOR',      name: 'Reator',           x: 100,  y: 380, width: 260, height: 240, color: '#1e1854' },
  { id: 'SECURITY',     name: 'Segurança',        x: 460,  y: 400, width: 240, height: 200, color: '#2a1248' },
  // Bottom row
  { id: 'ELECTRICAL',   name: 'Elétrica',         x: 500,  y: 750, width: 280, height: 250, color: '#1a1842' },
  { id: 'STORAGE',      name: 'Armazém',          x: 880,  y: 780, width: 320, height: 250, color: '#1e3612' },
  { id: 'LOWER_ENGINE', name: 'Motor Inferior',   x: 150,  y: 780, width: 250, height: 200, color: '#2d1a4e' }
];

// ============================================================
//  WALL SEGMENTS
//
//  Each room has 4 sides but with doorway gaps (80px wide)
//  for corridors connecting rooms. Players walk through gaps.
// ============================================================

export const MAP_WALLS: WallSegment[] = [

  // === CAFETERIA (800,350 -> 1200,650) ===
  // Top wall (full)
  { x1: 800, y1: 350, x2: 1200, y2: 350 },
  // Right wall: gap 460-540 for corridor to Navigation
  { x1: 1200, y1: 350, x2: 1200, y2: 460 },
  { x1: 1200, y1: 540, x2: 1200, y2: 650 },
  // Bottom wall: gap 940-1060 for corridor to Storage
  { x1: 800, y1: 650, x2: 940, y2: 650 },
  { x1: 1060, y1: 650, x2: 1200, y2: 650 },
  // Left wall: gap 460-540 for corridor to Security
  { x1: 800, y1: 350, x2: 800, y2: 460 },
  { x1: 800, y1: 540, x2: 800, y2: 650 },

  // === CORRIDOR: Cafeteria -> Navigation (1200,460 to 1400,540) ===
  { x1: 1200, y1: 460, x2: 1400, y2: 460 },
  { x1: 1200, y1: 540, x2: 1400, y2: 540 },

  // === NAVIGATION (1400,400 -> 1680,600) ===
  // Top wall (full)
  { x1: 1400, y1: 400, x2: 1680, y2: 400 },
  // Right wall (full)
  { x1: 1680, y1: 400, x2: 1680, y2: 600 },
  // Bottom wall (full)
  { x1: 1680, y1: 600, x2: 1400, y2: 600 },
  // Left wall: gap 460-540 for corridor from Cafeteria
  { x1: 1400, y1: 400, x2: 1400, y2: 460 },
  { x1: 1400, y1: 540, x2: 1400, y2: 600 },

  // === CORRIDOR: Cafeteria -> Security (700,460 to 800,540) ===
  { x1: 700, y1: 460, x2: 800, y2: 460 },
  { x1: 700, y1: 540, x2: 800, y2: 540 },

  // === SECURITY (460,400 -> 700,600) ===
  // Top wall (full)
  { x1: 460, y1: 400, x2: 700, y2: 400 },
  // Right wall: gap 460-540 for corridor to Cafeteria
  { x1: 700, y1: 400, x2: 700, y2: 460 },
  { x1: 700, y1: 540, x2: 700, y2: 600 },
  // Bottom wall: gap 540-620 for corridor down to Electrical
  { x1: 460, y1: 600, x2: 540, y2: 600 },
  { x1: 620, y1: 600, x2: 700, y2: 600 },
  // Left wall: gap 460-540 for corridor to Reactor
  { x1: 460, y1: 400, x2: 460, y2: 460 },
  { x1: 460, y1: 540, x2: 460, y2: 600 },

  // === CORRIDOR: Security -> Reactor (360,460 to 460,540) ===
  { x1: 360, y1: 460, x2: 460, y2: 460 },
  { x1: 360, y1: 540, x2: 460, y2: 540 },

  // === REACTOR (100,380 -> 360,620) ===
  // Top wall: gap 260-340 for corridor up to Upper Engine
  { x1: 100, y1: 380, x2: 260, y2: 380 },
  { x1: 340, y1: 380, x2: 360, y2: 380 },
  // Right wall: gap 460-540 for corridor to Security
  { x1: 360, y1: 380, x2: 360, y2: 460 },
  { x1: 360, y1: 540, x2: 360, y2: 620 },
  // Bottom wall (full)
  { x1: 360, y1: 620, x2: 100, y2: 620 },
  // Left wall (full)
  { x1: 100, y1: 620, x2: 100, y2: 380 },

  // === CORRIDOR: Reactor -> Upper Engine (260,300 to 340,380) ===
  { x1: 260, y1: 300, x2: 260, y2: 380 },
  { x1: 340, y1: 300, x2: 340, y2: 380 },

  // === UPPER ENGINE (200,100 -> 450,300) ===
  // Top wall (full)
  { x1: 200, y1: 100, x2: 450, y2: 100 },
  // Right wall: gap 200-280 for corridor to MedBay
  { x1: 450, y1: 100, x2: 450, y2: 200 },
  { x1: 450, y1: 280, x2: 450, y2: 300 },
  // Bottom wall: gap 260-340 for corridor down to Reactor
  { x1: 200, y1: 300, x2: 260, y2: 300 },
  { x1: 340, y1: 300, x2: 450, y2: 300 },
  // Left wall (full)
  { x1: 200, y1: 300, x2: 200, y2: 100 },

  // === CORRIDOR: Upper Engine -> MedBay (450,200 to 550,280) ===
  { x1: 450, y1: 200, x2: 550, y2: 200 },
  { x1: 450, y1: 280, x2: 550, y2: 280 },

  // === MEDBAY (550,100 -> 800,300) ===
  // Top wall (full)
  { x1: 550, y1: 100, x2: 800, y2: 100 },
  // Right wall: gap 200-280 for corridor to Cafeteria top area
  { x1: 800, y1: 100, x2: 800, y2: 350 },
  // Bottom wall: gap is the connection into Cafeteria top-left
  { x1: 550, y1: 300, x2: 800, y2: 300 },
  // Left wall: gap 200-280 for corridor from Upper Engine
  { x1: 550, y1: 100, x2: 550, y2: 200 },
  { x1: 550, y1: 280, x2: 550, y2: 300 },

  // === CORRIDOR: Security -> Electrical (540,600 to 620,750) ===
  { x1: 540, y1: 600, x2: 540, y2: 750 },
  { x1: 620, y1: 600, x2: 620, y2: 750 },

  // === ELECTRICAL (500,750 -> 780,1000) ===
  // Top wall: gap 540-620 for corridor from Security
  { x1: 500, y1: 750, x2: 540, y2: 750 },
  { x1: 620, y1: 750, x2: 780, y2: 750 },
  // Right wall: gap 860-940 for corridor to Storage
  { x1: 780, y1: 750, x2: 780, y2: 860 },
  { x1: 780, y1: 940, x2: 780, y2: 1000 },
  // Bottom wall: gap 340-420 for corridor to Lower Engine
  { x1: 500, y1: 1000, x2: 780, y2: 1000 },
  // Left wall
  { x1: 500, y1: 1000, x2: 500, y2: 750 },

  // === CORRIDOR: Electrical -> Storage (780,860 to 880,940) ===
  { x1: 780, y1: 860, x2: 880, y2: 860 },
  { x1: 780, y1: 940, x2: 880, y2: 940 },

  // === STORAGE (880,780 -> 1200,1030) ===
  // Top wall: gap 940-1060 for corridor from Cafeteria
  { x1: 880, y1: 780, x2: 1200, y2: 780 },
  // Right wall (full)
  { x1: 1200, y1: 780, x2: 1200, y2: 1030 },
  // Bottom wall (full)
  { x1: 1200, y1: 1030, x2: 880, y2: 1030 },
  // Left wall: gap 860-940 for corridor to Electrical
  { x1: 880, y1: 780, x2: 880, y2: 860 },
  { x1: 880, y1: 940, x2: 880, y2: 1030 },

  // === CORRIDOR: Cafeteria bottom -> Storage top (940,650 to 1060,780) ===
  { x1: 940, y1: 650, x2: 940, y2: 780 },
  { x1: 1060, y1: 650, x2: 1060, y2: 780 },

  // === CORRIDOR: Electrical left -> Lower Engine (400,860 to 500,940) ===
  // Lower Engine connects via bottom-left corridor
  // For simplicity, just have an open path between them

  // === LOWER ENGINE (150,780 -> 400,980) ===
  // Top wall (full)
  { x1: 150, y1: 780, x2: 400, y2: 780 },
  // Right wall: gap 860-940 for corridor to Electrical
  { x1: 400, y1: 780, x2: 400, y2: 860 },
  { x1: 400, y1: 940, x2: 400, y2: 980 },
  // Bottom wall (full)
  { x1: 400, y1: 980, x2: 150, y2: 980 },
  // Left wall (full)
  { x1: 150, y1: 980, x2: 150, y2: 780 },

  // === CORRIDOR: Lower Engine -> Electrical (400,860 to 500,940) ===
  { x1: 400, y1: 860, x2: 500, y2: 860 },
  { x1: 400, y1: 940, x2: 500, y2: 940 },
];

// Tasks are placed INSIDE their rooms
export const TASK_DEFINITIONS: TaskDefinition[] = [
  // Electrical (500-780, 750-1000)
  { id: 'task_elec_wiring',     roomId: 'ELECTRICAL', roomName: 'Elétrica',   type: 'WIRING',     x: 550, y: 800, length: 'SHORT' },
  { id: 'task_elec_switches',   roomId: 'ELECTRICAL', roomName: 'Elétrica',   type: 'SWITCHES',   x: 720, y: 850, length: 'SHORT' },
  { id: 'task_elec_calibrate',  roomId: 'ELECTRICAL', roomName: 'Elétrica',   type: 'CALIBRATE',  x: 640, y: 950, length: 'LONG' },

  // Navigation (1400-1680, 400-600)
  { id: 'task_nav_wiring',    roomId: 'NAVIGATION', roomName: 'Navegação',  type: 'WIRING',   x: 1630, y: 450, length: 'SHORT' },
  { id: 'task_nav_download',  roomId: 'NAVIGATION', roomName: 'Navegação',  type: 'DOWNLOAD', x: 1480, y: 550, length: 'LONG' },
  { id: 'task_nav_keypad',    roomId: 'NAVIGATION', roomName: 'Navegação',  type: 'KEYPAD',   x: 1600, y: 560, length: 'SHORT' },

  // Cafeteria (800-1200, 350-650)
  { id: 'task_caf_keypad',  roomId: 'CAFETERIA', roomName: 'Refeitório', type: 'KEYPAD', x: 1150, y: 400, length: 'SHORT' },
  { id: 'task_caf_wiring',  roomId: 'CAFETERIA', roomName: 'Refeitório', type: 'WIRING', x: 850,  y: 600, length: 'SHORT' },

  // Reactor (100-360, 380-620)
  { id: 'task_react_simon',     roomId: 'REACTOR', roomName: 'Reator', type: 'SIMON',     x: 180, y: 440, length: 'LONG' },
  { id: 'task_react_calibrate', roomId: 'REACTOR', roomName: 'Reator', type: 'CALIBRATE', x: 300, y: 560, length: 'SHORT' },

  // Storage (880-1200, 780-1030)
  { id: 'task_stor_refill',  roomId: 'STORAGE', roomName: 'Armazém', type: 'REFILL', x: 950, y: 960, length: 'LONG' },
  { id: 'task_stor_wiring',  roomId: 'STORAGE', roomName: 'Armazém', type: 'WIRING', x: 1120, y: 830, length: 'SHORT' },

  // MedBay (550-800, 100-300)
  { id: 'task_med_download', roomId: 'MEDBAY', roomName: 'Enfermaria', type: 'DOWNLOAD', x: 650, y: 180, length: 'SHORT' },

  // Security (460-700, 400-600)
  { id: 'task_sec_switches', roomId: 'SECURITY', roomName: 'Segurança', type: 'SWITCHES', x: 560, y: 460, length: 'SHORT' },
];

// Vents placed inside their respective rooms
export const VENTS: Vent[] = [
  { id: 'vent_elec',  roomId: 'ELECTRICAL',   x: 600, y: 960,  connectsTo: ['vent_sec', 'vent_med'] },
  { id: 'vent_sec',   roomId: 'SECURITY',     x: 520, y: 560,  connectsTo: ['vent_elec', 'vent_med'] },
  { id: 'vent_med',   roomId: 'MEDBAY',       x: 700, y: 260,  connectsTo: ['vent_elec', 'vent_sec'] },
  { id: 'vent_react', roomId: 'REACTOR',      x: 160, y: 570,  connectsTo: ['vent_upeng'] },
  { id: 'vent_upeng', roomId: 'UPPER_ENGINE', x: 300, y: 250,  connectsTo: ['vent_react'] },
  { id: 'vent_nav',   roomId: 'NAVIGATION',   x: 1640, y: 560, connectsTo: ['vent_caf'] },
  { id: 'vent_caf',   roomId: 'CAFETERIA',    x: 1150, y: 610, connectsTo: ['vent_nav'] }
];

export const SABOTAGE_NODES = {
  LIGHTS_BREAKER: { x: 700, y: 900, roomId: 'ELECTRICAL', roomName: 'Elétrica' },
  REACTOR_PAD_1:  { x: 180, y: 420, roomId: 'REACTOR',    roomName: 'Reator Pad 1' },
  REACTOR_PAD_2:  { x: 310, y: 420, roomId: 'REACTOR',    roomName: 'Reator Pad 2' },
  O2_KEYPAD_1:    { x: 1100, y: 420, roomId: 'CAFETERIA',  roomName: 'Refeitório O2' },
  O2_KEYPAD_2:    { x: 1550, y: 450, roomId: 'NAVIGATION', roomName: 'Navegação O2' }
};
