import { Vector2D } from './types';
import { WallSegment } from './mapData';

const ANGLE_EPSILON = 0.0001;

function normalizeAngle(angle: number): number {
  let normalized = angle;
  while (normalized <= -Math.PI) normalized += Math.PI * 2;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  return normalized;
}

function rayDistanceToWall(origin: Vector2D, angle: number, wall: WallSegment): number | null {
  const rayX = Math.cos(angle);
  const rayY = Math.sin(angle);
  const wallX = wall.x2 - wall.x1;
  const wallY = wall.y2 - wall.y1;
  const denominator = rayX * wallY - rayY * wallX;
  if (Math.abs(denominator) < 0.000001) return null;

  const offsetX = wall.x1 - origin.x;
  const offsetY = wall.y1 - origin.y;
  const rayDistance = (offsetX * wallY - offsetY * wallX) / denominator;
  const wallPosition = (offsetX * rayY - offsetY * rayX) / denominator;

  if (rayDistance < 0 || wallPosition < 0 || wallPosition > 1) return null;
  return rayDistance;
}

/**
 * Returns a field-of-view polygon whose rays stop at the first wall.
 * Endpoint-adjacent rays preserve sharp corners and open doorways.
 */
export function computeVisibilityPolygon(
  origin: Vector2D,
  direction: number,
  fieldOfView: number,
  range: number,
  walls: WallSegment[]
): Vector2D[] {
  const halfFov = fieldOfView / 2;
  const relativeAngles = new Set<number>([-halfFov, halfFov, 0]);
  const samplingSteps = Math.max(12, Math.ceil(fieldOfView / (Math.PI / 90)));

  for (let index = 0; index <= samplingSteps; index++) {
    relativeAngles.add(-halfFov + fieldOfView * index / samplingSteps);
  }

  for (const wall of walls) {
    for (const endpoint of [
      { x: wall.x1, y: wall.y1 },
      { x: wall.x2, y: wall.y2 }
    ]) {
      const relative = normalizeAngle(
        Math.atan2(endpoint.y - origin.y, endpoint.x - origin.x) - direction
      );
      if (relative < -halfFov || relative > halfFov) continue;
      relativeAngles.add(Math.max(-halfFov, relative - ANGLE_EPSILON));
      relativeAngles.add(relative);
      relativeAngles.add(Math.min(halfFov, relative + ANGLE_EPSILON));
    }
  }

  const points = [...relativeAngles]
    .sort((left, right) => left - right)
    .map(relativeAngle => {
      const angle = direction + relativeAngle;
      let distance = range;
      for (const wall of walls) {
        const intersectionDistance = rayDistanceToWall(origin, angle, wall);
        if (intersectionDistance !== null && intersectionDistance < distance) {
          distance = intersectionDistance;
        }
      }
      return {
        x: origin.x + Math.cos(angle) * distance,
        y: origin.y + Math.sin(angle) * distance
      };
    });

  return [origin, ...points];
}
