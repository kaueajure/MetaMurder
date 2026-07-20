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

// ============================================================
//  MAP: "Orbital Station Zero" - Expanded full layout
//  Total playable area: 2400 x 1600
//  11 rooms connected by wide corridors (80px doorways)
//
//  Layout (approximate):
//
//                  [Weapons]
//                     |
//  [Upper Engine] -- [MedBay] ---------- corridor
//        |                                  |
//  [Reactor] -- [Security] -- [Cafeteria] -- [Navigation]
//                    |             |
//  [Lower Engine] -- [Electrical] -- [Storage]
//                                      |
//                                  [Admin]
// ============================================================

export const MAP_BOUNDS = {
  width: 2400,
  height: 1600
};

export const EMERGENCY_BUTTON_POS: Vector2D = { x: 1100, y: 650 };

export const SPAWN_POINTS: Vector2D[] = [
  { x: 1060, y: 610 }, { x: 1140, y: 610 },
  { x: 1060, y: 690 }, { x: 1140, y: 690 },
  { x: 1020, y: 650 }, { x: 1180, y: 650 },
  { x: 1100, y: 590 }, { x: 1100, y: 710 },
  { x: 1040, y: 670 }, { x: 1160, y: 670 }
];

export const ROOMS: RoomRect[] = [
  // Central hub
  { id: 'CAFETERIA',    name: 'Refeitório',      x: 900,  y: 500, width: 400, height: 300, color: '#1a2744' },
  // Right wing
  { id: 'NAVIGATION',   name: 'Navegação',       x: 1600, y: 550, width: 300, height: 250, color: '#142238' },
  // Admin below Storage
  { id: 'ADMIN',        name: 'Administração',   x: 1350, y: 1100, width: 280, height: 220, color: '#1c2a3a' },
  // Left wing top
  { id: 'UPPER_ENGINE', name: 'Motor Superior',   x: 150,  y: 150, width: 260, height: 220, color: '#2d1a4e' },
  { id: 'MEDBAY',       name: 'Enfermaria',       x: 520,  y: 180, width: 280, height: 220, color: '#0c3a2a' },
  { id: 'WEAPONS',      name: 'Armamento',        x: 700,  y: 50,  width: 260, height: 200, color: '#3a1a1a' },
  // Left wing middle
  { id: 'REACTOR',      name: 'Reator',           x: 80,   y: 480, width: 280, height: 260, color: '#1e1854' },
  { id: 'SECURITY',     name: 'Segurança',        x: 460,  y: 530, width: 260, height: 240, color: '#2a1248' },
  // Bottom
  { id: 'ELECTRICAL',   name: 'Elétrica',         x: 480,  y: 950, width: 300, height: 270, color: '#1a1842' },
  { id: 'STORAGE',      name: 'Armazém',          x: 1000, y: 980, width: 340, height: 280, color: '#1e3612' },
  { id: 'LOWER_ENGINE', name: 'Motor Inferior',   x: 120,  y: 960, width: 260, height: 220, color: '#2d1a4e' },
];

// DOOR = 80px gap in wall
const D = 80;

export const MAP_WALLS: WallSegment[] = [
  // === CAFETERIA (900,500 -> 1300,800) ===
  // Top wall: gap for corridor to Weapons area (1040-1120)
  { x1: 900, y1: 500, x2: 1040, y2: 500 },
  { x1: 1120, y1: 500, x2: 1300, y2: 500 },
  // Right wall: gap 610-690 for corridor to Navigation
  { x1: 1300, y1: 500, x2: 1300, y2: 610 },
  { x1: 1300, y1: 690, x2: 1300, y2: 800 },
  // Bottom wall: gap 1040-1120 for corridor to Storage
  { x1: 900, y1: 800, x2: 1040, y2: 800 },
  { x1: 1120, y1: 800, x2: 1300, y2: 800 },
  // Left wall: gap 610-690 for corridor to Security
  { x1: 900, y1: 500, x2: 900, y2: 610 },
  { x1: 900, y1: 690, x2: 900, y2: 800 },

  // === CORRIDOR: Cafeteria -> Navigation (1300,610 to 1600,690) ===
  { x1: 1300, y1: 610, x2: 1600, y2: 610 },
  { x1: 1300, y1: 690, x2: 1600, y2: 690 },

  // === NAVIGATION (1600,550 -> 1900,800) ===
  { x1: 1600, y1: 550, x2: 1900, y2: 550 },
  { x1: 1900, y1: 550, x2: 1900, y2: 800 },
  { x1: 1900, y1: 800, x2: 1600, y2: 800 },
  { x1: 1600, y1: 550, x2: 1600, y2: 610 },
  { x1: 1600, y1: 690, x2: 1600, y2: 800 },

  // === CORRIDOR: Cafeteria -> Security (720,610 to 900,690) ===
  { x1: 720, y1: 610, x2: 900, y2: 610 },
  { x1: 720, y1: 690, x2: 900, y2: 690 },

  // === SECURITY (460,530 -> 720,770) ===
  { x1: 460, y1: 530, x2: 720, y2: 530 },
  { x1: 720, y1: 530, x2: 720, y2: 610 },
  { x1: 720, y1: 690, x2: 720, y2: 770 },
  // Bottom: gap 550-630 for corridor to Electrical
  { x1: 460, y1: 770, x2: 550, y2: 770 },
  { x1: 630, y1: 770, x2: 720, y2: 770 },
  // Left: gap 610-690 for corridor to Reactor
  { x1: 460, y1: 530, x2: 460, y2: 610 },
  { x1: 460, y1: 690, x2: 460, y2: 770 },

  // === CORRIDOR: Security -> Reactor (360,610 to 460,690) ===
  { x1: 360, y1: 610, x2: 460, y2: 610 },
  { x1: 360, y1: 690, x2: 460, y2: 690 },

  // === REACTOR (80,480 -> 360,740) ===
  // Top: gap 200-280 for corridor to Upper Engine
  { x1: 80, y1: 480, x2: 200, y2: 480 },
  { x1: 280, y1: 480, x2: 360, y2: 480 },
  { x1: 360, y1: 480, x2: 360, y2: 610 },
  { x1: 360, y1: 690, x2: 360, y2: 740 },
  { x1: 360, y1: 740, x2: 80, y2: 740 },
  { x1: 80, y1: 740, x2: 80, y2: 480 },

  // === CORRIDOR: Reactor -> Upper Engine (200,370 to 280,480) ===
  { x1: 200, y1: 370, x2: 200, y2: 480 },
  { x1: 280, y1: 370, x2: 280, y2: 480 },

  // === UPPER ENGINE (150,150 -> 410,370) ===
  { x1: 150, y1: 150, x2: 410, y2: 150 },
  // Right: gap 270-350 for corridor to MedBay
  { x1: 410, y1: 150, x2: 410, y2: 270 },
  { x1: 410, y1: 350, x2: 410, y2: 370 },
  // Bottom: gap 200-280 for corridor to Reactor
  { x1: 150, y1: 370, x2: 200, y2: 370 },
  { x1: 280, y1: 370, x2: 410, y2: 370 },
  { x1: 150, y1: 370, x2: 150, y2: 150 },

  // === CORRIDOR: Upper Engine -> MedBay (410,270 to 520,350) ===
  { x1: 410, y1: 270, x2: 520, y2: 270 },
  { x1: 410, y1: 350, x2: 520, y2: 350 },

  // === MEDBAY (520,180 -> 800,400) ===
  { x1: 520, y1: 180, x2: 800, y2: 180 },
  // Right: gap 280-360 for corridor to Weapons
  { x1: 800, y1: 180, x2: 800, y2: 400 },
  // Bottom: connect to corridor area
  { x1: 800, y1: 400, x2: 520, y2: 400 },
  { x1: 520, y1: 180, x2: 520, y2: 270 },
  { x1: 520, y1: 350, x2: 520, y2: 400 },

  // === WEAPONS (700,50 -> 960,250) ===
  // Connected to MedBay via open area (700-800, 180-250)
  { x1: 700, y1: 50, x2: 960, y2: 50 },
  { x1: 960, y1: 50, x2: 960, y2: 250 },
  { x1: 960, y1: 250, x2: 800, y2: 250 },
  // Gap 700-800 connects to MedBay top
  { x1: 700, y1: 250, x2: 700, y2: 180 },
  { x1: 700, y1: 180, x2: 700, y2: 50 },

  // === CORRIDOR: Security -> Electrical (550,770 to 630,950) ===
  { x1: 550, y1: 770, x2: 550, y2: 950 },
  { x1: 630, y1: 770, x2: 630, y2: 950 },

  // === ELECTRICAL (480,950 -> 780,1220) ===
  { x1: 480, y1: 950, x2: 550, y2: 950 },
  { x1: 630, y1: 950, x2: 780, y2: 950 },
  // Right: gap 1060-1140 for corridor to Storage
  { x1: 780, y1: 950, x2: 780, y2: 1060 },
  { x1: 780, y1: 1140, x2: 780, y2: 1220 },
  { x1: 780, y1: 1220, x2: 480, y2: 1220 },
  // Left: gap 1060-1140 for corridor to Lower Engine
  { x1: 480, y1: 1220, x2: 480, y2: 1140 },
  { x1: 480, y1: 1060, x2: 480, y2: 950 },

  // === CORRIDOR: Electrical -> Storage (780,1060 to 1000,1140) ===
  { x1: 780, y1: 1060, x2: 1000, y2: 1060 },
  { x1: 780, y1: 1140, x2: 1000, y2: 1140 },

  // === STORAGE (1000,980 -> 1340,1260) ===
  // Top: gap 1040-1120 for corridor from Cafeteria
  { x1: 1000, y1: 980, x2: 1340, y2: 980 },
  { x1: 1340, y1: 980, x2: 1340, y2: 1100 },
  // Right: gap 1100-1180 for corridor to Admin
  { x1: 1340, y1: 1180, x2: 1340, y2: 1260 },
  { x1: 1340, y1: 1260, x2: 1000, y2: 1260 },
  // Left: gap 1060-1140 for corridor from Electrical
  { x1: 1000, y1: 980, x2: 1000, y2: 1060 },
  { x1: 1000, y1: 1140, x2: 1000, y2: 1260 },

  // === CORRIDOR: Cafeteria bottom -> Storage top (1040,800 to 1120,980) ===
  { x1: 1040, y1: 800, x2: 1040, y2: 980 },
  { x1: 1120, y1: 800, x2: 1120, y2: 980 },

  // === CORRIDOR: Storage -> Admin (1340,1100 to 1350,1180) ===
  // Admin touches Storage right side so just a small gap
  // Actually Admin is at 1350,1100 so it's right next to Storage

  // === ADMIN (1350,1100 -> 1630,1320) ===
  { x1: 1350, y1: 1100, x2: 1630, y2: 1100 },
  { x1: 1630, y1: 1100, x2: 1630, y2: 1320 },
  { x1: 1630, y1: 1320, x2: 1350, y2: 1320 },
  // Left: gap 1100-1180 (connects to Storage right gap)
  { x1: 1350, y1: 1100, x2: 1350, y2: 1100 },  // tiny
  { x1: 1350, y1: 1180, x2: 1350, y2: 1320 },

  // === CORRIDOR: Electrical -> Lower Engine (380,1060 to 480,1140) ===
  { x1: 380, y1: 1060, x2: 480, y2: 1060 },
  { x1: 380, y1: 1140, x2: 480, y2: 1140 },

  // === LOWER ENGINE (120,960 -> 380,1180) ===
  { x1: 120, y1: 960, x2: 380, y2: 960 },
  { x1: 380, y1: 960, x2: 380, y2: 1060 },
  { x1: 380, y1: 1140, x2: 380, y2: 1180 },
  { x1: 380, y1: 1180, x2: 120, y2: 1180 },
  { x1: 120, y1: 1180, x2: 120, y2: 960 },
];

// All tasks placed well inside their rooms
export const TASK_DEFINITIONS: TaskDefinition[] = [
  // Electrical (480-780, 950-1220)
  { id: 'task_elec_wiring',     roomId: 'ELECTRICAL', roomName: 'Elétrica',        type: 'WIRING',     x: 540, y: 1010, length: 'SHORT' },
  { id: 'task_elec_switches',   roomId: 'ELECTRICAL', roomName: 'Elétrica',        type: 'SWITCHES',   x: 720, y: 1060, length: 'SHORT' },
  { id: 'task_elec_calibrate',  roomId: 'ELECTRICAL', roomName: 'Elétrica',        type: 'CALIBRATE',  x: 630, y: 1170, length: 'LONG' },

  // Navigation (1600-1900, 550-800)
  { id: 'task_nav_wiring',    roomId: 'NAVIGATION', roomName: 'Navegação',       type: 'WIRING',   x: 1830, y: 620, length: 'SHORT' },
  { id: 'task_nav_download',  roomId: 'NAVIGATION', roomName: 'Navegação',       type: 'DOWNLOAD', x: 1680, y: 740, length: 'LONG' },
  { id: 'task_nav_keypad',    roomId: 'NAVIGATION', roomName: 'Navegação',       type: 'KEYPAD',   x: 1800, y: 740, length: 'SHORT' },

  // Cafeteria (900-1300, 500-800)
  { id: 'task_caf_keypad',  roomId: 'CAFETERIA', roomName: 'Refeitório',       type: 'KEYPAD', x: 1240, y: 560, length: 'SHORT' },
  { id: 'task_caf_wiring',  roomId: 'CAFETERIA', roomName: 'Refeitório',       type: 'WIRING', x: 960,  y: 750, length: 'SHORT' },

  // Reactor (80-360, 480-740)
  { id: 'task_react_simon',     roomId: 'REACTOR', roomName: 'Reator',          type: 'SIMON',     x: 160, y: 560, length: 'LONG' },
  { id: 'task_react_calibrate', roomId: 'REACTOR', roomName: 'Reator',          type: 'CALIBRATE', x: 300, y: 680, length: 'SHORT' },

  // Storage (1000-1340, 980-1260)
  { id: 'task_stor_refill',  roomId: 'STORAGE', roomName: 'Armazém',          type: 'REFILL', x: 1100, y: 1200, length: 'LONG' },
  { id: 'task_stor_wiring',  roomId: 'STORAGE', roomName: 'Armazém',          type: 'WIRING', x: 1280, y: 1040, length: 'SHORT' },

  // MedBay (520-800, 180-400)
  { id: 'task_med_download', roomId: 'MEDBAY', roomName: 'Enfermaria',       type: 'DOWNLOAD', x: 660, y: 260, length: 'SHORT' },
  { id: 'task_med_scan',     roomId: 'MEDBAY', roomName: 'Enfermaria',       type: 'CALIBRATE', x: 600, y: 360, length: 'LONG' },

  // Security (460-720, 530-770)
  { id: 'task_sec_switches', roomId: 'SECURITY', roomName: 'Segurança',       type: 'SWITCHES', x: 560, y: 600, length: 'SHORT' },

  // Upper Engine (150-410, 150-370)
  { id: 'task_upeng_fuel',   roomId: 'UPPER_ENGINE', roomName: 'Motor Superior', type: 'REFILL',   x: 280, y: 250, length: 'LONG' },

  // Lower Engine (120-380, 960-1180)
  { id: 'task_loweng_fuel',  roomId: 'LOWER_ENGINE', roomName: 'Motor Inferior', type: 'REFILL',   x: 250, y: 1060, length: 'LONG' },

  // Weapons (700-960, 50-250)
  { id: 'task_weap_target',  roomId: 'WEAPONS', roomName: 'Armamento',        type: 'SIMON',   x: 830, y: 140, length: 'SHORT' },

  // Admin (1350-1630, 1100-1320)
  { id: 'task_admin_card',   roomId: 'ADMIN', roomName: 'Administração',     type: 'KEYPAD',   x: 1490, y: 1200, length: 'SHORT' },
  { id: 'task_admin_upload', roomId: 'ADMIN', roomName: 'Administração',     type: 'DOWNLOAD', x: 1560, y: 1150, length: 'LONG' },
];

export const VENTS: Vent[] = [
  { id: 'vent_elec',  roomId: 'ELECTRICAL',   x: 600, y: 1180,  connectsTo: ['vent_sec', 'vent_med'] },
  { id: 'vent_sec',   roomId: 'SECURITY',     x: 540, y: 720,   connectsTo: ['vent_elec', 'vent_med'] },
  { id: 'vent_med',   roomId: 'MEDBAY',       x: 750, y: 360,   connectsTo: ['vent_elec', 'vent_sec'] },
  { id: 'vent_react', roomId: 'REACTOR',      x: 140, y: 700,   connectsTo: ['vent_upeng'] },
  { id: 'vent_upeng', roomId: 'UPPER_ENGINE', x: 300, y: 320,   connectsTo: ['vent_react'] },
  { id: 'vent_nav',   roomId: 'NAVIGATION',   x: 1850, y: 760,  connectsTo: ['vent_caf', 'vent_admin'] },
  { id: 'vent_caf',   roomId: 'CAFETERIA',    x: 1250, y: 760,  connectsTo: ['vent_nav'] },
  { id: 'vent_admin', roomId: 'ADMIN',        x: 1580, y: 1280, connectsTo: ['vent_nav', 'vent_stor'] },
  { id: 'vent_stor',  roomId: 'STORAGE',      x: 1280, y: 1220, connectsTo: ['vent_admin'] },
];

export const SABOTAGE_NODES = {
  LIGHTS_BREAKER: { x: 700, y: 1100, roomId: 'ELECTRICAL', roomName: 'Elétrica' },
  REACTOR_PAD_1:  { x: 160, y: 520,  roomId: 'REACTOR',    roomName: 'Reator Pad 1' },
  REACTOR_PAD_2:  { x: 310, y: 520,  roomId: 'REACTOR',    roomName: 'Reator Pad 2' },
  O2_KEYPAD_1:    { x: 1200, y: 560, roomId: 'CAFETERIA',  roomName: 'Refeitório O2' },
  O2_KEYPAD_2:    { x: 1750, y: 600, roomId: 'NAVIGATION', roomName: 'Navegação O2' },
  COMMS_CONSOLE:  { x: 700, y: 1350, roomId: 'COMMUNICATIONS', roomName: 'Comunicações' }
};
