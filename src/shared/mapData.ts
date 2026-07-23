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

export interface FloorArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObstacleRect {
  id: string;
  kind: 'SOFA' | 'TABLE' | 'PLANTER' | 'DESK' | 'SHELF' | 'SERVER_RACK' | 'CAR';
  x: number;
  y: number;
  width: number;
  height: number;
}

// Escritório MetaMurder, reconstruído a partir da planta baixa fornecida.
// A mesma geometria alimenta renderização, minimapa, colisão e navegação.
export const MAP_BOUNDS = {
  width: 2400,
  height: 1000
};

export const BUILDING_BOUNDS = {
  x: 60,
  y: 60,
  width: 2280,
  height: 880
};

export const CORRIDOR_AREAS: FloorArea[] = [
  { id: 'MAIN_CORRIDOR', x: 60, y: 560, width: 2280, height: 90 }
];

export const SPAWN_POINTS: Vector2D[] = [
  { x: 1130, y: 595 }, { x: 1210, y: 595 },
  { x: 1290, y: 595 }, { x: 1370, y: 595 },
  { x: 1090, y: 625 }, { x: 1170, y: 625 },
  { x: 1250, y: 625 }, { x: 1330, y: 625 },
  { x: 1410, y: 625 }, { x: 1490, y: 625 }
];

export const ROOMS: RoomRect[] = [
  { id: 'FUMODROMO',       name: 'Fumódromo',       x: 60,   y: 60,  width: 290, height: 500, color: '#26384a' },
  { id: 'CONSULTORIA',      name: 'Consultoria',      x: 350,  y: 60,  width: 470, height: 240, color: '#20394b' },
  { id: 'SALA_LAZER',       name: 'Sala de Lazer',    x: 350,  y: 300, width: 470, height: 260, color: '#29354c' },
  { id: 'BANHEIRO_NORTE',   name: 'Banheiro',         x: 820,  y: 60,  width: 160, height: 220, color: '#244354' },
  { id: 'ACESSO_NORTE',     name: 'Acesso',           x: 820,  y: 280, width: 160, height: 280, color: '#172d40' },
  { id: 'AREA_VERDE',       name: 'Área Verde',       x: 980,  y: 60,  width: 440, height: 220, color: '#174237' },
  { id: 'REUNIAO',          name: 'Reunião',          x: 980,  y: 280, width: 440, height: 280, color: '#203f43' },
  { id: 'DESENVOLVIMENTO',  name: 'Desenvolvimento',  x: 1420, y: 60,  width: 400, height: 500, color: '#222d4a' },
  { id: 'COMERCIAL',        name: 'Comercial',        x: 1820, y: 60,  width: 360, height: 500, color: '#2d3148' },
  { id: 'BANHEIRO_LESTE',   name: 'Banheiro',         x: 2180, y: 60,  width: 160, height: 200, color: '#244354' },
  { id: 'ACESSO_LESTE',     name: 'Acesso Leste',     x: 2180, y: 260, width: 160, height: 300, color: '#172d40' },
  { id: 'COZINHA',          name: 'Cozinha',          x: 60,   y: 650, width: 620, height: 290, color: '#3c3328' },
  { id: 'BANHEIRO_M',       name: 'Banheiro M',       x: 680,  y: 650, width: 190, height: 145, color: '#244354' },
  { id: 'BANHEIRO_F',       name: 'Banheiro F',       x: 680,  y: 795, width: 190, height: 145, color: '#2c3f55' },
  { id: 'SALA_DIGUINHO',    name: 'Sala Diguinho',    x: 980,  y: 650, width: 280, height: 290, color: '#2d2d4d' },
  { id: 'SUPRIMENTOS',      name: 'Suprimentos',      x: 1260, y: 650, width: 320, height: 170, color: '#39402d' },
  { id: 'SERVER',           name: 'Server',           x: 1260, y: 820, width: 320, height: 120, color: '#321e3f' },
  { id: 'SALA_TONHO',       name: 'Sala Tonho',       x: 1580, y: 650, width: 300, height: 290, color: '#28394b' },
  { id: 'GARAGEM',          name: 'Garagem',          x: 1880, y: 650, width: 460, height: 290, color: '#30383b' }
];

function horizontalWall(y: number, start: number, end: number, gaps: Array<[number, number]> = []): WallSegment[] {
  const segments: WallSegment[] = [];
  let cursor = start;
  for (const [gapStart, gapEnd] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (gapStart > cursor) segments.push({ x1: cursor, y1: y, x2: gapStart, y2: y });
    cursor = Math.max(cursor, gapEnd);
  }
  if (cursor < end) segments.push({ x1: cursor, y1: y, x2: end, y2: y });
  return segments;
}

function verticalWall(x: number, start: number, end: number, gaps: Array<[number, number]> = []): WallSegment[] {
  const segments: WallSegment[] = [];
  let cursor = start;
  for (const [gapStart, gapEnd] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (gapStart > cursor) segments.push({ x1: x, y1: cursor, x2: x, y2: gapStart });
    cursor = Math.max(cursor, gapEnd);
  }
  if (cursor < end) segments.push({ x1: x, y1: cursor, x2: x, y2: end });
  return segments;
}

export const MAP_WALLS: WallSegment[] = [
  // Contorno externo do prédio.
  ...horizontalWall(60, 60, 2340),
  ...verticalWall(2340, 60, 940),
  ...horizontalWall(940, 60, 2340),
  ...verticalWall(60, 60, 940),

  // Fachada norte do corredor, com as portas da planta.
  ...horizontalWall(560, 60, 2340, [
    [260, 330],   // Fumódromo
    [470, 550],   // Consultoria
    [650, 730],   // Sala de Lazer
    [865, 935],   // acesso ao banheiro norte
    [1010, 1090], // átrio / área verde
    [1710, 1790], // Desenvolvimento
    [1990, 2070], // Comercial
    [2215, 2295]  // acesso ao banheiro leste
  ]),

  // Fachada sul do corredor.
  ...horizontalWall(650, 60, 2340, [
    [245, 325],   // Cozinha
    [1110, 1190], // Sala Diguinho
    [1360, 1440], // Suprimentos
    [1640, 1720], // Sala Tonho
    [2050, 2190]  // Garagem
  ]),

  // Divisões da ala norte.
  ...verticalWall(350, 60, 560),
  ...verticalWall(820, 60, 560),
  ...verticalWall(980, 60, 560),
  ...verticalWall(1420, 60, 560),
  ...verticalWall(1820, 60, 560),
  ...verticalWall(2180, 60, 560),
  ...horizontalWall(300, 350, 820, [[500, 580]]),
  ...horizontalWall(280, 820, 980, [[865, 935]]),
  ...horizontalWall(280, 980, 1420, [[1160, 1240]]),
  ...horizontalWall(260, 2180, 2340, [[2215, 2295]]),

  // Divisões da ala sul e o vazio estrutural entre banheiros e Sala Diguinho.
  ...verticalWall(680, 650, 940, [[700, 760], [835, 895]]),
  ...verticalWall(870, 650, 940),
  ...verticalWall(980, 650, 940),
  ...verticalWall(1260, 650, 940),
  ...verticalWall(1580, 650, 940),
  ...verticalWall(1880, 650, 940),
  ...horizontalWall(795, 680, 870),
  ...horizontalWall(820, 1260, 1580, [[1480, 1560]])
];

// Móveis grandes da planta também têm colisão. Objetos pequenos permanecem
// apenas decorativos para não transformar os ambientes em labirintos.
export const MAP_OBSTACLES: ObstacleRect[] = [
  { id: 'fumo_sofa', kind: 'SOFA', x: 88, y: 120, width: 55, height: 180 },
  { id: 'consult_table', kind: 'TABLE', x: 500, y: 90, width: 180, height: 65 },
  { id: 'lazer_sofa', kind: 'SOFA', x: 540, y: 485, width: 120, height: 48 },
  { id: 'green_planter_w', kind: 'PLANTER', x: 1015, y: 90, width: 80, height: 120 },
  { id: 'green_planter_e', kind: 'PLANTER', x: 1300, y: 90, width: 80, height: 120 },
  { id: 'meeting_planter', kind: 'PLANTER', x: 1100, y: 470, width: 180, height: 55 },
  { id: 'dev_desk_n', kind: 'DESK', x: 1490, y: 125, width: 250, height: 48 },
  { id: 'dev_desk_s', kind: 'DESK', x: 1510, y: 360, width: 220, height: 48 },
  { id: 'commercial_desk', kind: 'DESK', x: 1920, y: 180, width: 140, height: 70 },
  { id: 'kitchen_table', kind: 'TABLE', x: 290, y: 835, width: 230, height: 90 },
  { id: 'diguinho_table', kind: 'TABLE', x: 1060, y: 830, width: 140, height: 70 },
  { id: 'supply_shelves', kind: 'SHELF', x: 1280, y: 760, width: 160, height: 35 },
  { id: 'server_rack', kind: 'SERVER_RACK', x: 1270, y: 840, width: 80, height: 70 },
  { id: 'tonho_table', kind: 'TABLE', x: 1660, y: 840, width: 150, height: 75 },
  { id: 'garage_car_w', kind: 'CAR', x: 1970, y: 720, width: 110, height: 180 },
  { id: 'garage_car_e', kind: 'CAR', x: 2160, y: 720, width: 110, height: 180 }
];

export const TASK_DEFINITIONS: TaskDefinition[] = [
  { id: 'task_fumo_filter',       roomId: 'FUMODROMO',      roomName: 'Fumódromo',      type: 'SWITCHES',  x: 270,  y: 160, length: 'SHORT' },
  { id: 'task_consult_download',  roomId: 'CONSULTORIA',     roomName: 'Consultoria',     type: 'DOWNLOAD',  x: 740,  y: 150, length: 'LONG' },
  { id: 'task_lazer_console',     roomId: 'SALA_LAZER',      roomName: 'Sala de Lazer',   type: 'KEYPAD',    x: 420,  y: 450, length: 'SHORT' },
  { id: 'task_bath_sensor',       roomId: 'BANHEIRO_NORTE',  roomName: 'Banheiro',        type: 'CALIBRATE', x: 900,  y: 140, length: 'SHORT' },
  { id: 'task_green_irrigation',  roomId: 'AREA_VERDE',      roomName: 'Área Verde',      type: 'REFILL',    x: 1200, y: 180, length: 'LONG' },
  { id: 'task_meeting_lights',    roomId: 'REUNIAO',         roomName: 'Reunião',         type: 'SWITCHES',  x: 1330, y: 420, length: 'SHORT' },
  { id: 'task_dev_wiring',        roomId: 'DESENVOLVIMENTO', roomName: 'Desenvolvimento', type: 'WIRING',    x: 1760, y: 180, length: 'SHORT' },
  { id: 'task_dev_compile',       roomId: 'DESENVOLVIMENTO', roomName: 'Desenvolvimento', type: 'SIMON',     x: 1740, y: 470, length: 'LONG' },
  { id: 'task_commercial_upload', roomId: 'COMERCIAL',       roomName: 'Comercial',       type: 'DOWNLOAD',  x: 2110, y: 160, length: 'LONG' },
  { id: 'task_commercial_keypad', roomId: 'COMERCIAL',       roomName: 'Comercial',       type: 'KEYPAD',    x: 2100, y: 430, length: 'SHORT' },
  { id: 'task_kitchen_refill',    roomId: 'COZINHA',         roomName: 'Cozinha',         type: 'REFILL',    x: 140,  y: 850, length: 'LONG' },
  { id: 'task_kitchen_switches',  roomId: 'COZINHA',         roomName: 'Cozinha',         type: 'SWITCHES',  x: 590,  y: 730, length: 'SHORT' },
  { id: 'task_bath_wiring',       roomId: 'BANHEIRO_F',      roomName: 'Banheiro F',      type: 'WIRING',    x: 780,  y: 860, length: 'SHORT' },
  { id: 'task_diguinho_keypad',   roomId: 'SALA_DIGUINHO',   roomName: 'Sala Diguinho',   type: 'KEYPAD',    x: 1020, y: 700, length: 'SHORT' },
  { id: 'task_supply_inventory',  roomId: 'SUPRIMENTOS',     roomName: 'Suprimentos',     type: 'CALIBRATE', x: 1350, y: 710, length: 'LONG' },
  { id: 'task_server_wiring',     roomId: 'SERVER',          roomName: 'Server',          type: 'WIRING',    x: 1525, y: 850, length: 'SHORT' },
  { id: 'task_server_restart',    roomId: 'SERVER',          roomName: 'Server',          type: 'SIMON',     x: 1525, y: 910, length: 'LONG' },
  { id: 'task_tonho_download',    roomId: 'SALA_TONHO',      roomName: 'Sala Tonho',      type: 'DOWNLOAD',  x: 1850, y: 875, length: 'LONG' },
  { id: 'task_garage_calibrate',  roomId: 'GARAGEM',         roomName: 'Garagem',         type: 'CALIBRATE', x: 1920, y: 700, length: 'SHORT' },
  { id: 'task_garage_wiring',     roomId: 'GARAGEM',         roomName: 'Garagem',         type: 'WIRING',    x: 2310, y: 700, length: 'SHORT' }
];

export const VENTS: Vent[] = [
  { id: 'vent_fumo',   roomId: 'FUMODROMO',      x: 120,  y: 500, connectsTo: ['vent_server', 'vent_dev'] },
  { id: 'vent_dev',    roomId: 'DESENVOLVIMENTO', x: 1490, y: 500, connectsTo: ['vent_fumo', 'vent_garage'] },
  { id: 'vent_server', roomId: 'SERVER',          x: 1380, y: 900, connectsTo: ['vent_fumo', 'vent_garage'] },
  { id: 'vent_garage', roomId: 'GARAGEM',         x: 2310, y: 880, connectsTo: ['vent_dev', 'vent_server'] },
  { id: 'vent_green',  roomId: 'AREA_VERDE',      x: 1245, y: 120, connectsTo: ['vent_kitchen'] },
  { id: 'vent_kitchen', roomId: 'COZINHA',        x: 590,  y: 880, connectsTo: ['vent_green'] }
];

export const SABOTAGE_NODES = {
  LIGHTS_BREAKER: { x: 1525, y: 850, roomId: 'SERVER', roomName: 'Server' },
  REACTOR_PAD_1:  { x: 1490, y: 170, roomId: 'DESENVOLVIMENTO', roomName: 'Desenvolvimento 1' },
  REACTOR_PAD_2:  { x: 1740, y: 470, roomId: 'DESENVOLVIMENTO', roomName: 'Desenvolvimento 2' },
  O2_KEYPAD_1:    { x: 1200, y: 180, roomId: 'AREA_VERDE', roomName: 'Área Verde' },
  O2_KEYPAD_2:    { x: 2310, y: 700, roomId: 'GARAGEM', roomName: 'Garagem' },
  COMMS_CONSOLE:  { x: 2110, y: 160, roomId: 'COMERCIAL', roomName: 'Comercial' }
};
