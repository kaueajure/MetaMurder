import { PlayerPublicData } from '../../shared/types';

export class Interpolator {
  private targetPositions: Map<string, { x: number; y: number; vx: number; vy: number }> = new Map();

  public updateTarget(player: PlayerPublicData): void {
    this.targetPositions.set(player.id, {
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy
    });
  }

  public getInterpolatedPosition(id: string, currentX: number, currentY: number, lerpFactor: number = 0.3): { x: number; y: number } {
    const target = this.targetPositions.get(id);
    if (!target) return { x: currentX, y: currentY };

    const newX = currentX + (target.x - currentX) * lerpFactor;
    const newY = currentY + (target.y - currentY) * lerpFactor;

    return { x: newX, y: newY };
  }
}
