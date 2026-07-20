import { Vector2D } from '../shared/types';
import { MAP_WALLS, WallSegment } from '../shared/mapData';

const PLAYER_RADIUS = 18;

export function clampPosition(current: Vector2D, next: Vector2D): Vector2D {
  // Global Map Boundaries
  const minX = 60;
  const maxX = 1940;
  const minY = 60;
  const maxY = 1140;

  let targetX = Math.max(minX, Math.min(maxX, next.x));
  let targetY = Math.max(minY, Math.min(maxY, next.y));

  // Try full step (x + vx, y + vy)
  if (!checkWallCollision({ x: targetX, y: targetY }, PLAYER_RADIUS)) {
    return { x: targetX, y: targetY };
  }

  // Wall Sliding: Try X movement alone
  if (!checkWallCollision({ x: targetX, y: current.y }, PLAYER_RADIUS)) {
    return { x: targetX, y: current.y };
  }

  // Wall Sliding: Try Y movement alone
  if (!checkWallCollision({ x: current.x, y: targetY }, PLAYER_RADIUS)) {
    return { x: current.x, y: targetY };
  }

  // Otherwise stay at current position
  return { x: current.x, y: current.y };
}

export function checkWallCollision(center: Vector2D, radius: number): boolean {
  for (const wall of MAP_WALLS) {
    if (circleSegmentCollision(center, radius, wall)) {
      return true;
    }
  }
  return false;
}

export function hasLineOfSight(p1: Vector2D, p2: Vector2D): boolean {
  for (const wall of MAP_WALLS) {
    if (lineLineIntersection(p1, p2, { x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 })) {
      return false;
    }
  }
  return true;
}

function circleSegmentCollision(center: Vector2D, radius: number, wall: WallSegment): boolean {
  const { x1, y1, x2, y2 } = wall;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return false;

  let u = ((center.x - x1) * dx + (center.y - y1) * dy) / lenSq;
  u = Math.max(0, Math.min(1, u));

  const nearestX = x1 + u * dx;
  const nearestY = y1 + u * dy;

  const distX = center.x - nearestX;
  const distY = center.y - nearestY;

  return (distX * distX + distY * distY) < (radius * radius);
}

function lineLineIntersection(p1: Vector2D, p2: Vector2D, p3: Vector2D, p4: Vector2D): boolean {
  const det = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (det === 0) return false;

  const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
  const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;

  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}
