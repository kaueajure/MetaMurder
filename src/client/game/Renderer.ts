import { PlayerPublicData, PlayerPrivateData, DeadBody, SabotageState } from '../../shared/types';
import { ROOMS, MAP_WALLS, EMERGENCY_BUTTON_POS, TASK_DEFINITIONS, VENTS, SABOTAGE_NODES } from '../../shared/mapData';
import { PLAYER_COLORS } from '../../shared/constants';

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

    // 3. Render Walls
    this.renderWalls(ctx);

    // 4. Render Map Interactable Objects (Emergency Button, Tasks, Vents, Sabotage Nodes)
    this.renderMapObjects(ctx, nearbyInteractable);

    // 5. Render Dead Bodies
    this.renderBodies(ctx, bodies);

    // 6. Render Players
    players.forEach(player => {
      // Don't render self if dead and looking at alive world, or render ghosts with transparency
      if (player.inVent) return; // Hidden inside vent

      const isSelf = player.id === self.id;
      this.renderPlayerCharacter(ctx, player, isSelf);
    });

    // 7. Render Fog of War / Vision Shadow (if Lights sabotage active or normal vision cutoff)
    if (self.state === 'ALIVE') {
      this.renderFogOfWar(ctx, self, sabotage);
    }

    ctx.restore();
  }

  private renderSpaceGrid(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#090D16';
    ctx.fillRect(-500, -500, 3000, 2200);

    // Subtle starfield points
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let x = -400; x < 2800; x += 120) {
      for (let y = -400; y < 2000; y += 120) {
        ctx.fillRect(x + ((x * 7) % 50), y + ((y * 11) % 50), 2, 2);
      }
    }
  }

  private renderRooms(ctx: CanvasRenderingContext2D): void {
    ROOMS.forEach(room => {
      // Room floor
      ctx.fillStyle = room.color;
      ctx.fillRect(room.x, room.y, room.width, room.height);

      // Floor grid tiles pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name.toUpperCase(), room.x + room.width / 2, room.y + room.height / 2);
    });
  }

  private renderWalls(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#38BDF8'; // Cyan sci-fi wall borders
    ctx.lineWidth = 6;
    ctx.shadowColor = '#0284C7';
    ctx.shadowBlur = 8;

    MAP_WALLS.forEach(wall => {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    });

    ctx.shadowBlur = 0; // reset shadow
  }

  private renderMapObjects(ctx: CanvasRenderingContext2D, nearbyId: string | null): void {
    // 1. Emergency Meeting Button Table
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(EMERGENCY_BUTTON_POS.x, EMERGENCY_BUTTON_POS.y, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Red Glass Dome Button
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(EMERGENCY_BUTTON_POS.x, EMERGENCY_BUTTON_POS.y, 20, 0, Math.PI * 2);
    ctx.fill();

    if (nearbyId === 'EMERGENCY_BUTTON') {
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 2. Vents
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

    // 3. Task Stations
    TASK_DEFINITIONS.forEach(task => {
      const isNearby = nearbyId === task.id;

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

      // Suit body lying flat
      ctx.fillStyle = colorObj.hex;
      ctx.beginPath();
      ctx.ellipse(body.x, body.y, 24, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Exposed bone graphic
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(body.x - 4, body.y - 12, 8, 12);
      ctx.beginPath();
      ctx.arc(body.x - 4, body.y - 12, 4, 0, Math.PI * 2);
      ctx.arc(body.x + 4, body.y - 12, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  public renderPlayerCharacter(ctx: CanvasRenderingContext2D, player: PlayerPublicData, isSelf: boolean): void {
    ctx.save();
    ctx.translate(player.x, player.y);

    const isGhost = player.state === 'DEAD' || player.state === 'GHOST';
    if (isGhost) {
      ctx.globalAlpha = 0.5;
    }

    const colorObj = PLAYER_COLORS.find(c => c.id === player.color) || PLAYER_COLORS[0];
    const facingLeft = player.facing === 'LEFT';

    // Flip horizontal if facing left
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    // Walking animation bounce
    const isMoving = Math.abs(player.vx) > 5 || Math.abs(player.vy) > 5;
    const bounceY = isMoving ? Math.sin(Date.now() / 80) * 4 : 0;

    // 1. Oxygen Backpack
    ctx.fillStyle = colorObj.darkHex;
    ctx.fillRect(-22, -18 + bounceY, 10, 26);

    // 2. Main Body Capsule
    ctx.fillStyle = colorObj.hex;
    ctx.beginPath();
    ctx.roundRect(-15, -28 + bounceY, 30, 42, 14);
    ctx.fill();

    // 3. Glass Visor
    ctx.fillStyle = '#38BDF8'; // Cyan reflection
    ctx.beginPath();
    ctx.roundRect(2, -22 + bounceY, 16, 16, 6);
    ctx.fill();

    // Visor highlight arc
    ctx.fillStyle = '#E0F2FE';
    ctx.beginPath();
    ctx.arc(8, -18 + bounceY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Reset flip scale for name text
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    // 4. Player Name Tag
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isSelf ? '#FACC15' : '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(player.name, 0, -36 + bounceY);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private renderFogOfWar(ctx: CanvasRenderingContext2D, self: PlayerPrivateData, sabotage: SabotageState): void {
    const visionRadius = sabotage.activeType === 'LIGHTS' ? 100 : 280;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Draw dark radial gradient mask around self
    const grad = this.ctx.createRadialGradient(self.x, self.y, visionRadius * 0.5, self.x, self.y, visionRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(9, 13, 22, 0.95)');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(self.x, self.y, visionRadius, 0, Math.PI * 2);
    this.ctx.rect(self.x + canvasWidth, self.y - canvasHeight, -canvasWidth * 2, canvasHeight * 2);
    this.ctx.fill('evenodd');
  }
}
