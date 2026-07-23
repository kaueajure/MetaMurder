import { PLAYER_COLORS } from '../../shared/constants';
import { PlayerPublicData } from '../../shared/types';

interface CharacterRenderOptions {
  isSelf?: boolean;
  scale?: number;
  showName?: boolean;
  time?: number;
  preview?: boolean;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  player: PlayerPublicData,
  options: CharacterRenderOptions = {}
): void {
  const color = PLAYER_COLORS.find(candidate => candidate.id === player.color) ?? PLAYER_COLORS[0];
  const time = options.time ?? performance.now();
  const moving = Math.abs(player.vx) > 5 || Math.abs(player.vy) > 5;
  const walkPhase = moving ? time / 115 : 0;
  const bounce = moving ? Math.abs(Math.sin(walkPhase)) * 3 : Math.sin(time / 900) * 0.8;
  const legSwing = moving ? Math.sin(walkPhase) * 4 : 0;
  const facing = player.facing === 'LEFT' ? -1 : 1;
  const scale = options.scale ?? 1;
  const isGhost = player.state === 'DEAD' || player.state === 'GHOST';

  ctx.save();
  ctx.scale(scale, scale);
  ctx.globalAlpha = isGhost ? 0.48 : 1;

  // Grounding shadow makes the character feel planted in the world.
  const shadow = ctx.createRadialGradient(0, 18, 2, 0, 18, 27);
  shadow.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 18, 29, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bounce);

  // Separate animated boots.
  const bootGradient = ctx.createLinearGradient(0, 9, 0, 27);
  bootGradient.addColorStop(0, color.darkHex);
  bootGradient.addColorStop(1, '#07101d');
  ctx.fillStyle = bootGradient;
  roundedRect(ctx, -16 + legSwing * 0.25, 7, 13, 20, 6);
  ctx.fill();
  roundedRect(ctx, 3 - legSwing * 0.25, 7, 13, 20, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundedRect(ctx, -14 + legSwing * 0.25, 9, 8, 5, 2);
  ctx.fill();
  roundedRect(ctx, 5 - legSwing * 0.25, 9, 8, 5, 2);
  ctx.fill();

  ctx.save();
  ctx.scale(facing, 1);

  // Backpack with a metallic edge.
  const backpack = ctx.createLinearGradient(-28, -20, -12, 12);
  backpack.addColorStop(0, '#0b1729');
  backpack.addColorStop(0.45, color.darkHex);
  backpack.addColorStop(1, '#050a12');
  ctx.fillStyle = backpack;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, -27, -21, 17, 34, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#22d3ee';
  roundedRect(ctx, -28, -9, 3, 11, 1.5);
  ctx.fill();

  // Volumetric suit shell.
  const suit = ctx.createLinearGradient(-21, -34, 23, 18);
  suit.addColorStop(0, lighten(color.hex, 30));
  suit.addColorStop(0.38, color.hex);
  suit.addColorStop(0.78, color.darkHex);
  suit.addColorStop(1, '#09111f');
  ctx.fillStyle = suit;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = color.hex;
  ctx.shadowBlur = options.preview ? 16 : 8;
  roundedRect(ctx, -20, -34, 42, 52, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  // Shoulder rim and side shade.
  const rim = ctx.createLinearGradient(-19, 0, 7, 0);
  rim.addColorStop(0, 'rgba(255,255,255,0.46)');
  rim.addColorStop(0.28, 'rgba(255,255,255,0.08)');
  rim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rim;
  roundedRect(ctx, -17, -29, 18, 39, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundedRect(ctx, 13, -23, 8, 32, 5);
  ctx.fill();

  drawSkin(ctx, player.skinId, color.hex, color.darkHex);

  // Glass helmet, layered highlights and reflected light.
  const visor = ctx.createLinearGradient(0, -27, 25, -5);
  visor.addColorStop(0, '#e0faff');
  visor.addColorStop(0.22, '#67e8f9');
  visor.addColorStop(0.58, '#1686b5');
  visor.addColorStop(1, '#082f49');
  ctx.fillStyle = visor;
  ctx.strokeStyle = '#a5f3fc';
  ctx.lineWidth = 1.7;
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 10;
  roundedRect(ctx, -1, -27, 27, 22, 9);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  const visorReflection = ctx.createLinearGradient(4, -24, 18, -11);
  visorReflection.addColorStop(0, 'rgba(255,255,255,0.86)');
  visorReflection.addColorStop(0.32, 'rgba(255,255,255,0.2)');
  visorReflection.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = visorReflection;
  roundedRect(ctx, 4, -23, 12, 7, 4);
  ctx.fill();

  drawHat(ctx, player.hatId, color.hex, color.darkHex);
  ctx.restore();

  if (options.showName !== false && player.name) {
    ctx.font = '800 13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.strokeText(player.name, 0, -48);
    ctx.fillStyle = options.isSelf ? '#fde047' : '#f8fafc';
    ctx.fillText(player.name, 0, -48);
  }

  ctx.restore();
}

function drawSkin(
  ctx: CanvasRenderingContext2D,
  skinId: string,
  color: string,
  darkColor: string
): void {
  if (skinId === 'CYBER_ARMOR') {
    const armor = ctx.createLinearGradient(-15, -12, 19, 13);
    armor.addColorStop(0, '#94a3b8');
    armor.addColorStop(0.5, '#334155');
    armor.addColorStop(1, '#0f172a');
    ctx.fillStyle = armor;
    ctx.strokeStyle = '#cbd5e1';
    roundedRect(ctx, -17, -10, 36, 25, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 7;
    roundedRect(ctx, -8, -3, 18, 4, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (skinId === 'LAB_COAT') {
    const coat = ctx.createLinearGradient(-16, -10, 18, 15);
    coat.addColorStop(0, '#ffffff');
    coat.addColorStop(0.55, '#e2e8f0');
    coat.addColorStop(1, '#94a3b8');
    ctx.fillStyle = coat;
    roundedRect(ctx, -17, -10, 36, 27, 7);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, -9);
    ctx.lineTo(1, 16);
    ctx.stroke();
    ctx.fillStyle = color;
    roundedRect(ctx, 6, 3, 8, 6, 2);
    ctx.fill();
  } else if (skinId === 'STEALTH_SUIT') {
    const stealth = ctx.createLinearGradient(-18, -28, 20, 15);
    stealth.addColorStop(0, '#334155');
    stealth.addColorStop(0.55, '#0f172a');
    stealth.addColorStop(1, '#020617');
    ctx.fillStyle = stealth;
    roundedRect(ctx, -18, -29, 38, 44, 15);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.moveTo(-12, 5);
    ctx.lineTo(12, 5);
    ctx.stroke();
    ctx.globalAlpha /= 0.8;
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundedRect(ctx, -11, 5, 23, 7, 3);
    ctx.fill();
    ctx.fillStyle = darkColor;
    roundedRect(ctx, -4, 7, 9, 3, 1.5);
    ctx.fill();
  }
}

function drawHat(
  ctx: CanvasRenderingContext2D,
  hatId: string,
  color: string,
  darkColor: string
): void {
  if (hatId === 'CAPTAIN_HAT') {
    const cap = ctx.createLinearGradient(0, -48, 0, -31);
    cap.addColorStop(0, '#ffffff');
    cap.addColorStop(1, '#94a3b8');
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(0, -33, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    roundedRect(ctx, -15, -45, 30, 13, 6);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, -39, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === 'CROWN') {
    const crown = ctx.createLinearGradient(0, -54, 0, -30);
    crown.addColorStop(0, '#fff7ae');
    crown.addColorStop(0.45, '#facc15');
    crown.addColorStop(1, '#a16207');
    ctx.fillStyle = crown;
    ctx.strokeStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-17, -31);
    ctx.lineTo(-19, -50);
    ctx.lineTo(-9, -42);
    ctx.lineTo(0, -55);
    ctx.lineTo(9, -42);
    ctx.lineTo(19, -50);
    ctx.lineTo(17, -31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hatId === 'VR_GOGGLES') {
    ctx.fillStyle = '#050b16';
    ctx.strokeStyle = '#64748b';
    roundedRect(ctx, -3, -26, 31, 15, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fb7185';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 8;
    roundedRect(ctx, 2, -23, 21, 3, 1.5);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (hatId === 'VIKING_HELMET') {
    const metal = ctx.createLinearGradient(-17, -46, 17, -30);
    metal.addColorStop(0, '#e2e8f0');
    metal.addColorStop(0.5, '#64748b');
    metal.addColorStop(1, '#1e293b');
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.arc(0, -31, 17, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-13, -35);
    ctx.quadraticCurveTo(-27, -52, -30, -42);
    ctx.quadraticCurveTo(-24, -36, -15, -29);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13, -35);
    ctx.quadraticCurveTo(27, -52, 30, -42);
    ctx.quadraticCurveTo(24, -36, 15, -29);
    ctx.fill();
  } else if (hatId === 'ANTENNA') {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.quadraticCurveTo(3, -45, 0, -53);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, -54, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (hatId === 'HEADPHONES') {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -29, 19, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.strokeStyle = darkColor;
    [-20, 14].forEach(x => {
      roundedRect(ctx, x, -32, 7, 16, 3);
      ctx.fill();
      ctx.stroke();
    });
  } else if (hatId === 'CAT_EARS') {
    const ears = ctx.createLinearGradient(0, -49, 0, -29);
    ears.addColorStop(0, lighten(color, 25));
    ears.addColorStop(1, darkColor);
    ctx.fillStyle = ears;
    ctx.beginPath();
    ctx.moveTo(-16, -31);
    ctx.lineTo(-18, -50);
    ctx.lineTo(-3, -35);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, -31);
    ctx.lineTo(18, -50);
    ctx.lineTo(3, -35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f9a8d4';
    ctx.beginPath();
    ctx.moveTo(-14, -35);
    ctx.lineTo(-16, -45);
    ctx.lineTo(-7, -37);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, -35);
    ctx.lineTo(16, -45);
    ctx.lineTo(7, -37);
    ctx.closePath();
    ctx.fill();
  }
}

function lighten(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const number = Number.parseInt(value, 16);
  const red = Math.min(255, (number >> 16) + amount);
  const green = Math.min(255, ((number >> 8) & 0xff) + amount);
  const blue = Math.min(255, (number & 0xff) + amount);
  return `rgb(${red}, ${green}, ${blue})`;
}
