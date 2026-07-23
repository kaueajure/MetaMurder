import { PlayerPublicData, PlayerPrivateData, DeadBody, SabotageState } from '../../shared/types';
import {
  BUILDING_BOUNDS,
  CAMERA_CONSOLE,
  CORRIDOR_AREAS,
  MAP_BOUNDS,
  MAP_OBSTACLES,
  MAP_WALLS,
  ROOMS,
  SABOTAGE_NODES,
  SECURITY_CAMERAS,
  SecurityCamera,
  TASK_DEFINITIONS,
  VENTS
} from '../../shared/mapData';
import { PLAYER_COLORS } from '../../shared/constants';
import { drawCharacter } from './CharacterRenderer';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public render(
    self: PlayerPrivateData,
    players: PlayerPublicData[],
    bodies: DeadBody[],
    sabotage: SabotageState,
    nearbyInteractable: string | null
  ): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Camera follows self player position
    ctx.save();
    const cameraX = width / 2 - self.x;
    const cameraY = height / 2 - self.y;
    ctx.translate(cameraX, cameraY);

    // 1. Render Background Space grid
    this.renderSpaceGrid(ctx);

    // 2. Render Rooms & Floors
    this.renderRooms(ctx);

    // 3. Render furniture from the supplied floor plan.
    this.renderFurniture(ctx);

    // 4. Render Walls
    this.renderWalls(ctx);

    // 5. Render Map Interactable Objects
    this.renderMapObjects(ctx, nearbyInteractable, self);

    // 6. Render Dead Bodies
    this.renderBodies(ctx, bodies);

    // 7. Render Players
    players.forEach(player => {
      // Don't render self if dead and looking at alive world, or render ghosts with transparency
      if (player.inVent) return; // Hidden inside vent

      const isSelf = player.id === self.id;
      this.renderPlayerCharacter(ctx, player, isSelf);
    });

    // 8. Render Fog of War / Vision Shadow (if Lights sabotage active or normal vision cutoff)
    if (self.state === 'ALIVE') {
      this.renderFogOfWar(ctx, self, sabotage);
    }

    ctx.restore();
  }

  public renderCameraFeed(
    camera: SecurityCamera,
    players: PlayerPublicData[],
    bodies: DeadBody[]
  ): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 - camera.viewX, height / 2 - camera.viewY);
    this.renderSpaceGrid(ctx);
    this.renderRooms(ctx);
    this.renderFurniture(ctx);
    this.renderWalls(ctx);

    const observer: PlayerPrivateData = {
      id: '__camera__',
      name: '',
      isBot: false,
      color: 'WHITE',
      hatId: 'NONE',
      skinId: 'DEFAULT',
      x: camera.viewX,
      y: camera.viewY,
      vx: 0,
      vy: 0,
      facing: 'RIGHT',
      state: 'ALIVE',
      isReady: true,
      isHost: false,
      inVent: false,
      currentVentId: null,
      role: 'CREWMATE',
      tasks: [],
      killCooldownRemaining: 0,
      sabotageCooldownRemaining: 0
    };
    this.renderMapObjects(ctx, null, observer);
    this.renderBodies(ctx, bodies);
    players
      .filter(player => !player.inVent)
      .forEach(player => this.renderPlayerCharacter(ctx, player, false));
    ctx.restore();

    // Monitor scanlines and edge vignette are rendered in screen space.
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, width * 0.68);
    vignette.addColorStop(0, 'rgba(2,6,23,0)');
    vignette.addColorStop(1, 'rgba(2,6,23,.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(103,232,249,.045)';
    for (let y = 0; y < height; y += 5) ctx.fillRect(0, y, width, 1);
  }

  private renderSpaceGrid(ctx: CanvasRenderingContext2D): void {
    const mapCenterX = MAP_BOUNDS.width / 2;
    const mapCenterY = MAP_BOUNDS.height / 2;
    const voidGradient = ctx.createRadialGradient(mapCenterX, mapCenterY, 180, mapCenterX, mapCenterY, 1450);
    voidGradient.addColorStop(0, '#111d31');
    voidGradient.addColorStop(0.58, '#07101d');
    voidGradient.addColorStop(1, '#02050c');
    ctx.fillStyle = voidGradient;
    ctx.fillRect(-500, -500, MAP_BOUNDS.width + 1000, MAP_BOUNDS.height + 1000);

    // Base shadow follows the footprint of the supplied building plan.
    ctx.fillStyle = '#02050b';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 36;
    ctx.fillRect(
      BUILDING_BOUNDS.x - 10,
      BUILDING_BOUNDS.y - 10,
      BUILDING_BOUNDS.width + 20,
      BUILDING_BOUNDS.height + 20
    );
    ctx.shadowBlur = 0;

    // The long central corridor is the circulation spine of the new map.
    const deck = ctx.createLinearGradient(0, 0, MAP_BOUNDS.width, MAP_BOUNDS.height);
    deck.addColorStop(0, '#152338');
    deck.addColorStop(0.5, '#0b1627');
    deck.addColorStop(1, '#111c2d');
    ctx.fillStyle = deck;
    CORRIDOR_AREAS.forEach(area => ctx.fillRect(area.x, area.y, area.width, area.height));

    // Recessed panels are clipped visually to the corridor.
    ctx.save();
    ctx.beginPath();
    CORRIDOR_AREAS.forEach(area => ctx.rect(area.x, area.y, area.width, area.height));
    ctx.clip();
    ctx.lineWidth = 1;
    for (let x = 60; x < MAP_BOUNDS.width - 40; x += 80) {
      ctx.strokeStyle = x % 160 === 60 ? 'rgba(103,232,249,.07)' : 'rgba(255,255,255,.025)';
      ctx.beginPath();
      ctx.moveTo(x, BUILDING_BOUNDS.y);
      ctx.lineTo(x, BUILDING_BOUNDS.y + BUILDING_BOUNDS.height);
      ctx.stroke();
    }
    for (let y = 60; y < MAP_BOUNDS.height - 40; y += 80) {
      ctx.strokeStyle = y % 160 === 60 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.moveTo(BUILDING_BOUNDS.x, y);
      ctx.lineTo(BUILDING_BOUNDS.x + BUILDING_BOUNDS.width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Directional guide lights embedded in the deck.
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 9;
    ctx.fillStyle = 'rgba(34,211,238,.48)';
    for (let x = 100; x < MAP_BOUNDS.width - 80; x += 180) {
      ctx.fillRect(x, 573, 42, 3);
      ctx.fillRect(x, 634, 42, 3);
    }
    ctx.shadowBlur = 0;
  }

  private renderRooms(ctx: CanvasRenderingContext2D): void {
    ROOMS.forEach(room => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.72)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#030712';
      ctx.fillRect(room.x - 5, room.y - 5, room.width + 10, room.height + 10);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      const floor = ctx.createLinearGradient(room.x, room.y, room.x + room.width, room.y + room.height);
      floor.addColorStop(0, lightenHex(room.color, 18));
      floor.addColorStop(0.48, room.color);
      floor.addColorStop(1, '#080f1c');
      ctx.fillStyle = floor;
      ctx.fillRect(room.x, room.y, room.width, room.height);

      // Bevel: bright top/left, recessed lower/right.
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(148, 230, 255, .22)';
      ctx.beginPath();
      ctx.moveTo(room.x + 2, room.y + room.height - 2);
      ctx.lineTo(room.x + 2, room.y + 2);
      ctx.lineTo(room.x + room.width - 2, room.y + 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.48)';
      ctx.beginPath();
      ctx.moveTo(room.x + room.width - 2, room.y + 2);
      ctx.lineTo(room.x + room.width - 2, room.y + room.height - 2);
      ctx.lineTo(room.x + 2, room.y + room.height - 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 1;
      for (let gx = room.x; gx < room.x + room.width; gx += 50) {
        ctx.beginPath();
        ctx.moveTo(gx, room.y);
        ctx.lineTo(gx, room.y + room.height);
        ctx.stroke();
      }
      for (let gy = room.y; gy < room.y + room.height; gy += 50) {
        ctx.beginPath();
        ctx.moveTo(room.x, gy);
        ctx.lineTo(room.x + room.width, gy);
        ctx.stroke();
      }

      // Room Name Label
      ctx.fillStyle = 'rgba(226, 244, 255, 0.3)';
      ctx.font = '800 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name.toUpperCase(), room.x + room.width / 2, room.y + room.height / 2);
      ctx.restore();
    });

    ctx.fillStyle = 'rgba(103, 232, 249, .24)';
    ctx.font = '900 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CORREDOR', MAP_BOUNDS.width / 2, 615);
  }

  private renderFurniture(ctx: CanvasRenderingContext2D): void {
    MAP_OBSTACLES.forEach(obstacle => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.65)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 7;

      const gradient = ctx.createLinearGradient(
        obstacle.x,
        obstacle.y,
        obstacle.x + obstacle.width,
        obstacle.y + obstacle.height
      );
      if (obstacle.kind === 'PLANTER') {
        gradient.addColorStop(0, '#1d5b42');
        gradient.addColorStop(1, '#0f2e28');
      } else if (obstacle.kind === 'CAR') {
        gradient.addColorStop(0, obstacle.id.endsWith('_w') ? '#18202d' : '#d5dde4');
        gradient.addColorStop(1, obstacle.id.endsWith('_w') ? '#05070d' : '#64748b');
      } else if (obstacle.kind === 'SERVER_RACK') {
        gradient.addColorStop(0, '#312e81');
        gradient.addColorStop(1, '#111827');
      } else {
        gradient.addColorStop(0, '#64748b');
        gradient.addColorStop(1, '#1e293b');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.kind === 'CAR' ? 28 : 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(186,230,253,.28)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (obstacle.kind === 'PLANTER') {
        ctx.fillStyle = '#4ade80';
        for (let x = obstacle.x + 15; x < obstacle.x + obstacle.width; x += 28) {
          for (let y = obstacle.y + 15; y < obstacle.y + obstacle.height; y += 32) {
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (obstacle.kind === 'CAR') {
        ctx.fillStyle = 'rgba(103,232,249,.38)';
        ctx.beginPath();
        ctx.roundRect(obstacle.x + 16, obstacle.y + 32, obstacle.width - 32, 48, 14);
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.fillRect(obstacle.x - 5, obstacle.y + 35, 9, 38);
        ctx.fillRect(obstacle.x + obstacle.width - 4, obstacle.y + 35, 9, 38);
        ctx.fillRect(obstacle.x - 5, obstacle.y + obstacle.height - 73, 9, 38);
        ctx.fillRect(obstacle.x + obstacle.width - 4, obstacle.y + obstacle.height - 73, 9, 38);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,.12)';
        ctx.lineWidth = 1;
        const divisions = obstacle.kind === 'SERVER_RACK' || obstacle.kind === 'SHELF' ? 5 : 3;
        for (let index = 1; index < divisions; index++) {
          const x = obstacle.x + obstacle.width * index / divisions;
          ctx.beginPath();
          ctx.moveTo(x, obstacle.y + 5);
          ctx.lineTo(x, obstacle.y + obstacle.height - 5);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  private renderWalls(ctx: CanvasRenderingContext2D): void {
    MAP_WALLS.forEach(wall => {
      // Thick structural rail.
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();

      const rail = ctx.createLinearGradient(wall.x1, wall.y1, wall.x2 || wall.x1 + 1, wall.y2 || wall.y1 + 1);
      rail.addColorStop(0, '#334155');
      rail.addColorStop(0.45, '#0f2034');
      rail.addColorStop(1, '#1e3a4f');
      ctx.strokeStyle = rail;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();

      // Thin emissive strip.
      ctx.strokeStyle = 'rgba(103,232,249,.72)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
    ctx.lineCap = 'butt';
  }

  private renderMapObjects(
    ctx: CanvasRenderingContext2D,
    nearbyId: string | null,
    self: PlayerPrivateData
  ): void {
    // 1. Vents
    VENTS.forEach(vent => {
      ctx.fillStyle = '#475569';
      ctx.fillRect(vent.x - 20, vent.y - 15, 40, 30);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.strokeRect(vent.x - 20, vent.y - 15, 40, 30);

      // Vent slats
      ctx.beginPath();
      ctx.moveTo(vent.x - 12, vent.y - 6);
      ctx.lineTo(vent.x + 12, vent.y - 6);
      ctx.moveTo(vent.x - 12, vent.y);
      ctx.lineTo(vent.x + 12, vent.y);
      ctx.moveTo(vent.x - 12, vent.y + 6);
      ctx.lineTo(vent.x + 12, vent.y + 6);
      ctx.stroke();

      if (nearbyId === vent.id) {
        ctx.strokeStyle = '#FACC15';
        ctx.strokeRect(vent.x - 23, vent.y - 18, 46, 36);
      }
    });

    // 2. Security cameras and their live monitoring console.
    SECURITY_CAMERAS.forEach(camera => {
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.rotate(camera.rotation);
      const cone = ctx.createLinearGradient(0, 0, 115, 0);
      cone.addColorStop(0, 'rgba(34,211,238,.16)');
      cone.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(115, -55);
      ctx.lineTo(115, 55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-13, -9, 30, 18, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(9, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    const consoleNearby = nearbyId === CAMERA_CONSOLE.id;
    ctx.save();
    ctx.translate(CAMERA_CONSOLE.x, CAMERA_CONSOLE.y);
    ctx.fillStyle = consoleNearby ? '#22d3ee' : '#164e63';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = consoleNearby ? 20 : 8;
    ctx.beginPath();
    ctx.roundRect(-22, -17, 44, 34, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#020617';
    ctx.fillRect(-14, -9, 28, 15);
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAM', 0, 3);
    if (consoleNearby) {
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('VER CÂMERAS [E]', 0, -28);
    }
    ctx.restore();

    // 3. Task Stations assigned to this player
    TASK_DEFINITIONS.forEach(task => {
      const assignedTask = self.tasks.find(playerTask => playerTask.definitionId === task.id);
      if (self.role === 'CREWMATE' && (!assignedTask || assignedTask.completed)) return;

      const isNearby = nearbyId === assignedTask?.id;

      // Outer glowing aura
      ctx.fillStyle = isNearby ? 'rgba(250, 204, 21, 0.4)' : 'rgba(234, 179, 8, 0.2)';
      ctx.beginPath();
      ctx.arc(task.x, task.y, isNearby ? 28 : 20, 0, Math.PI * 2);
      ctx.fill();

      // Main station icon
      ctx.fillStyle = isNearby ? '#FACC15' : '#EAB308';
      ctx.beginPath();
      ctx.arc(task.x, task.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', task.x, task.y + 5);

      // Floating interaction prompt text when player is near
      if (isNearby) {
        ctx.fillStyle = '#FACC15';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.fillText('⚡ FAZER TAREFA [E]', task.x, task.y - 26);
        ctx.shadowBlur = 0;
      }
    });

  }

  private renderBodies(ctx: CanvasRenderingContext2D, bodies: DeadBody[]): void {
    bodies.forEach(body => {
      const colorObj = PLAYER_COLORS.find(c => c.id === body.victimColor) || PLAYER_COLORS[0];

      ctx.save();
      ctx.translate(body.x, body.y);

      // Large pool and shadow keep the body readable against detailed floors.
      const shadow = ctx.createRadialGradient(0, 11, 4, 0, 11, 42);
      shadow.addColorStop(0, 'rgba(0,0,0,.62)');
      shadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(0, 12, 44, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      const suit = ctx.createLinearGradient(-30, -16, 28, 18);
      suit.addColorStop(0, lightenHex(colorObj.hex, 24));
      suit.addColorStop(0.48, colorObj.hex);
      suit.addColorStop(1, colorObj.darkHex);
      ctx.fillStyle = suit;
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-32, -13, 55, 31, 13);
      ctx.fill();
      ctx.stroke();

      // Broken visor.
      const visor = ctx.createLinearGradient(-23, -10, 2, 8);
      visor.addColorStop(0, '#cffafe');
      visor.addColorStop(0.45, '#22d3ee');
      visor.addColorStop(1, '#164e63');
      ctx.fillStyle = visor;
      ctx.beginPath();
      ctx.roundRect(-26, -9, 25, 17, 7);
      ctx.fill();
      ctx.strokeStyle = '#a5f3fc';
      ctx.stroke();
      ctx.strokeStyle = '#082f49';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-15, -7);
      ctx.lineTo(-11, 0);
      ctx.lineTo(-17, 7);
      ctx.stroke();

      // Exposed bone with a dark severed edge.
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.ellipse(25, 0, 9, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(23, -15, 8, 17);
      ctx.beginPath();
      ctx.arc(23, -15, 5, 0, Math.PI * 2);
      ctx.arc(31, -15, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fecaca';
      ctx.font = '900 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 5;
      ctx.fillText('CORPO', 0, 35);
      ctx.restore();
    });
  }

  public renderPlayerCharacter(ctx: CanvasRenderingContext2D, player: PlayerPublicData, isSelf: boolean): void {
    ctx.save();
    ctx.translate(player.x, player.y);
    drawCharacter(ctx, player, { isSelf, time: performance.now() });
    ctx.restore();
  }

  private renderFogOfWar(ctx: CanvasRenderingContext2D, self: PlayerPrivateData, sabotage: SabotageState): void {
    const visionRadius = sabotage.activeType === 'LIGHTS' ? 100 : 280;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';

    // 1. Draw solid dark mask with vision cutout using evenodd rule
    ctx.beginPath();
    ctx.rect(self.x - canvasWidth, self.y - canvasHeight, canvasWidth * 2, canvasHeight * 2);
    ctx.arc(self.x, self.y, visionRadius, 0, Math.PI * 2, true);
    ctx.fill('evenodd');

    // 2. Draw smooth radial gradient vignette along vision edge
    const grad = ctx.createRadialGradient(self.x, self.y, visionRadius * 0.7, self.x, self.y, visionRadius);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.94)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(self.x, self.y, visionRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function lightenHex(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const red = Math.min(255, (value >> 16) + amount);
  const green = Math.min(255, ((value >> 8) & 0xff) + amount);
  const blue = Math.min(255, (value & 0xff) + amount);
  return `rgb(${red}, ${green}, ${blue})`;
}
