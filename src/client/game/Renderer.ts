import { PlayerPublicData, PlayerPrivateData, DeadBody, SabotageState } from '../../shared/types';
import {
  BUILDING_BOUNDS,
  CAMERA_CONSOLE,
  CORRIDOR_AREAS,
  MAP_BOUNDS,
  MAP_OBSTACLES,
  MAP_WALLS,
  ObstacleRect,
  ROOMS,
  SABOTAGE_NODES,
  SECURITY_CAMERAS,
  SecurityCamera,
  TASK_DEFINITIONS,
  VENTS
} from '../../shared/mapData';
import { PLAYER_COLORS } from '../../shared/constants';
import { computeVisibilityPolygon } from '../../shared/visibility';
import { drawCharacter } from './CharacterRenderer';
import gardenTextureUrl from '../assets/office-garden-topdown.webp';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gardenTexture: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gardenTexture = new Image();
    this.gardenTexture.src = gardenTextureUrl;
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
    ctx.fillStyle = '#11110f';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 - camera.viewX, height / 2 - camera.viewY);
    const cameraEye = {
      x: camera.x + Math.cos(camera.rotation) * 18,
      y: camera.y + Math.sin(camera.rotation) * 18
    };
    const visibilityPolygon = computeVisibilityPolygon(
      cameraEye,
      camera.rotation,
      Math.PI * 0.62,
      560,
      MAP_WALLS
    );

    // Everything outside this polygon stays black. Rays terminate on the
    // first physical wall, so a feed can see through doors but never walls.
    ctx.save();
    ctx.beginPath();
    visibilityPolygon.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.clip();
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
    ctx.restore();

    // Neutral monitor treatment: no sci-fi glow, only lens falloff and scanlines.
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, width * 0.68);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,.025)';
    for (let y = 0; y < height; y += 5) ctx.fillRect(0, y, width, 1);
  }

  private renderSpaceGrid(ctx: CanvasRenderingContext2D): void {
    // Neutral exterior and a real architectural floor replace the old space deck.
    ctx.fillStyle = '#d5d2cb';
    ctx.fillRect(-500, -500, MAP_BOUNDS.width + 1000, MAP_BOUNDS.height + 1000);

    ctx.fillStyle = '#f7f6f2';
    ctx.shadowColor = 'rgba(45,42,37,.38)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    ctx.fillRect(
      BUILDING_BOUNDS.x,
      BUILDING_BOUNDS.y,
      BUILDING_BOUNDS.width,
      BUILDING_BOUNDS.height
    );
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#efeee9';
    CORRIDOR_AREAS.forEach(area => ctx.fillRect(area.x, area.y, area.width, area.height));

    // Large-format porcelain joints, kept subtle and non-reflective.
    ctx.save();
    ctx.beginPath();
    CORRIDOR_AREAS.forEach(area => ctx.rect(area.x, area.y, area.width, area.height));
    ctx.clip();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(120,113,108,.18)';
    for (let x = 60; x < MAP_BOUNDS.width - 40; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 560);
      ctx.lineTo(x, 650);
      ctx.stroke();
    }
    for (let y = 560; y <= 650; y += 45) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(2340, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderRooms(ctx: CanvasRenderingContext2D): void {
    ROOMS.forEach(room => {
      ctx.save();
      ctx.fillStyle = room.color;
      ctx.fillRect(room.x, room.y, room.width, room.height);

      if (room.id === 'AREA_VERDE') {
        if (this.gardenTexture.complete && this.gardenTexture.naturalWidth > 0) {
          const sourceSize = this.gardenTexture.naturalWidth;
          const sourceHeight = sourceSize * room.height / room.width;
          const sourceY = (this.gardenTexture.naturalHeight - sourceHeight) / 2;
          ctx.drawImage(
            this.gardenTexture,
            0,
            sourceY,
            sourceSize,
            sourceHeight,
            room.x,
            room.y,
            room.width,
            room.height
          );
        }
      } else {
        const tiledRoom =
          room.id.includes('BANHEIRO') ||
          room.id === 'COZINHA' ||
          room.id === 'GARAGEM';
        ctx.strokeStyle = tiledRoom
          ? 'rgba(120,113,108,.18)'
          : 'rgba(120,113,108,.10)';
        ctx.lineWidth = 1;
        const tileSize = tiledRoom ? 42 : 72;
        for (let gx = room.x; gx < room.x + room.width; gx += tileSize) {
          ctx.beginPath();
          ctx.moveTo(gx, room.y);
          ctx.lineTo(gx, room.y + room.height);
          ctx.stroke();
        }
        for (let gy = room.y; gy < room.y + room.height; gy += tileSize) {
          ctx.beginPath();
          ctx.moveTo(room.x, gy);
          ctx.lineTo(room.x + room.width, gy);
          ctx.stroke();
        }
      }

      const labelX = room.x + room.width / 2;
      const labelY = room.y + room.height / 2;
      ctx.font = '700 15px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const labelWidth = ctx.measureText(room.name.toUpperCase()).width + 18;
      ctx.fillStyle = 'rgba(255,255,255,.76)';
      ctx.fillRect(labelX - labelWidth / 2, labelY - 14, labelWidth, 22);
      ctx.fillStyle = '#44403c';
      ctx.fillText(room.name.toUpperCase(), labelX, labelY + 2);
      ctx.restore();
    });

    ctx.fillStyle = '#78716c';
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CORREDOR', MAP_BOUNDS.width / 2, 615);
  }

  private renderFurniture(ctx: CanvasRenderingContext2D): void {
    MAP_OBSTACLES.forEach(obstacle => {
      ctx.save();
      ctx.shadowColor = 'rgba(54,49,43,.28)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 5;

      const materialColors: Record<ObstacleRect['kind'], string> = {
        SOFA: '#a9a39a',
        TABLE: '#d7c6aa',
        PLANTER: '#6b5b4b',
        DESK: '#dedbd4',
        SHELF: '#c9b99e',
        SERVER_RACK: '#343434',
        CAR: obstacle.id.endsWith('_w') ? '#292b2d' : '#ecebea'
      };
      ctx.fillStyle = materialColors[obstacle.kind];
      ctx.beginPath();
      ctx.roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.kind === 'CAR' ? 28 : 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = obstacle.kind === 'SERVER_RACK' ? '#171717' : '#8e8981';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (obstacle.kind === 'PLANTER') {
        ctx.fillStyle = '#332a22';
        ctx.beginPath();
        ctx.roundRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10, 5);
        ctx.fill();
        const leafColors = ['#315b31', '#47753d', '#668c4a', '#25492d'];
        let leafIndex = 0;
        for (let x = obstacle.x + 15; x < obstacle.x + obstacle.width - 5; x += 24) {
          for (let y = obstacle.y + 15; y < obstacle.y + obstacle.height - 5; y += 25) {
            const leafColor = leafColors[leafIndex % leafColors.length];
            const rotation = (leafIndex * 1.37) % Math.PI;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.fillStyle = leafColor;
            ctx.beginPath();
            ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(230,240,220,.35)';
            ctx.lineWidth = .7;
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.stroke();
            ctx.restore();
            leafIndex++;
          }
        }
      } else if (obstacle.kind === 'CAR') {
        ctx.fillStyle = obstacle.id.endsWith('_w') ? '#55595c' : '#aeb4b5';
        ctx.beginPath();
        ctx.roundRect(obstacle.x + 16, obstacle.y + 31, obstacle.width - 32, 52, 13);
        ctx.fill();
        ctx.fillStyle = '#252525';
        ctx.beginPath();
        ctx.roundRect(obstacle.x + 18, obstacle.y + obstacle.height - 76, obstacle.width - 36, 47, 10);
        ctx.fill();
        ctx.fillStyle = '#181818';
        [
          [obstacle.x - 5, obstacle.y + 35],
          [obstacle.x + obstacle.width - 4, obstacle.y + 35],
          [obstacle.x - 5, obstacle.y + obstacle.height - 73],
          [obstacle.x + obstacle.width - 4, obstacle.y + obstacle.height - 73]
        ].forEach(([x, y]) => ctx.fillRect(x, y, 9, 38));
        ctx.fillStyle = '#fff7cc';
        ctx.fillRect(obstacle.x + 13, obstacle.y + 8, 18, 5);
        ctx.fillRect(obstacle.x + obstacle.width - 31, obstacle.y + 8, 18, 5);
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + 4);
        ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height - 4);
        ctx.stroke();
      } else if (obstacle.kind === 'SOFA') {
        ctx.strokeStyle = '#817b73';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + 8, obstacle.y + obstacle.height / 2);
        ctx.lineTo(obstacle.x + obstacle.width - 8, obstacle.y + obstacle.height / 2);
        ctx.stroke();
        ctx.fillStyle = '#8f8981';
        ctx.fillRect(obstacle.x + 5, obstacle.y + 5, 7, obstacle.height - 10);
        ctx.fillRect(obstacle.x + obstacle.width - 12, obstacle.y + 5, 7, obstacle.height - 10);
      } else if (obstacle.kind === 'TABLE') {
        ctx.fillStyle = '#f3f0e9';
        ctx.beginPath();
        ctx.roundRect(obstacle.x + 7, obstacle.y + 7, obstacle.width - 14, obstacle.height - 14, 5);
        ctx.fill();
        ctx.strokeStyle = '#b9aa91';
        ctx.stroke();
        ctx.fillStyle = '#706b64';
        const horizontal = obstacle.width > obstacle.height;
        const chairCount = Math.max(2, Math.floor((horizontal ? obstacle.width : obstacle.height) / 60));
        for (let index = 0; index < chairCount; index++) {
          const ratio = (index + 0.5) / chairCount;
          if (horizontal) {
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width * ratio, obstacle.y - 10, 8, 0, Math.PI * 2);
            ctx.arc(obstacle.x + obstacle.width * ratio, obstacle.y + obstacle.height + 10, 8, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(obstacle.x - 10, obstacle.y + obstacle.height * ratio, 8, 0, Math.PI * 2);
            ctx.arc(obstacle.x + obstacle.width + 10, obstacle.y + obstacle.height * ratio, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (obstacle.kind === 'DESK') {
        ctx.fillStyle = '#f7f6f2';
        ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
        ctx.fillStyle = '#4b5563';
        const monitorCount = Math.max(1, Math.floor(obstacle.width / 70));
        for (let index = 0; index < monitorCount; index++) {
          const monitorX = obstacle.x + (index + .5) * obstacle.width / monitorCount;
          ctx.fillRect(monitorX - 13, obstacle.y + 10, 26, 12);
          ctx.fillStyle = '#a8c0c5';
          ctx.fillRect(monitorX - 10, obstacle.y + 12, 20, 8);
          ctx.fillStyle = '#4b5563';
        }
      } else {
        ctx.strokeStyle = obstacle.kind === 'SERVER_RACK' ? '#777' : '#9d8d76';
        ctx.lineWidth = 1;
        const divisions = obstacle.kind === 'SERVER_RACK' || obstacle.kind === 'SHELF' ? 5 : 3;
        for (let index = 1; index < divisions; index++) {
          const x = obstacle.x + obstacle.width * index / divisions;
          ctx.beginPath();
          ctx.moveTo(x, obstacle.y + 5);
          ctx.lineTo(x, obstacle.y + obstacle.height - 5);
          ctx.stroke();
        }
        if (obstacle.kind === 'SERVER_RACK') {
          ctx.fillStyle = '#82a86f';
          for (let y = obstacle.y + 11; y < obstacle.y + obstacle.height - 5; y += 13) {
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width - 10, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    });
  }

  private renderWalls(ctx: CanvasRenderingContext2D): void {
    MAP_WALLS.forEach(wall => {
      // Real white partition wall with a restrained architectural shadow.
      ctx.strokeStyle = 'rgba(55,50,45,.24)';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(wall.x1 + 2, wall.y1 + 3);
      ctx.lineTo(wall.x2 + 2, wall.y2 + 3);
      ctx.stroke();

      ctx.strokeStyle = '#fafaf8';
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();

      ctx.strokeStyle = '#b8b5af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
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
      ctx.fillStyle = '#f5f5f4';
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-13, -9, 30, 18, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#262626';
      ctx.beginPath();
      ctx.arc(13, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-7, -3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78716c';
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(-20, -8);
      ctx.stroke();
      ctx.restore();
    });

    const consoleNearby = nearbyId === CAMERA_CONSOLE.id;
    ctx.save();
    ctx.translate(CAMERA_CONSOLE.x, CAMERA_CONSOLE.y);
    ctx.fillStyle = consoleNearby ? '#d6d3d1' : '#a8a29e';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(-22, -17, 44, 34, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#292524';
    ctx.fillRect(-14, -9, 28, 15);
    ctx.fillStyle = '#d6d3d1';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAM', 0, 3);
    if (consoleNearby) {
      ctx.fillStyle = '#292524';
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
