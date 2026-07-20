import { Vector2D, PlayerPublicData } from '../shared/types';
import { MAP_WALLS, WallSegment } from '../shared/mapData';

const PLAYER_RADIUS = 20;

export function clampPosition(current: Vector2D, next: Vector2D): Vector2D {
  let result = { x: next.x, y: next.y };

  // Keep within global bounds
  result.x = Math.max(50, Math.min(1950, result.x));
  result.y = Math.max(50, Math.min(1150, result.y));

  // Check collision with line walls
  for (const wall of MAP_WALLS) {
    if (circleSegmentCollision(result, PLAYER_RADIUS, wall)) {
      // Revert to current position if colliding
      result = { x: current.x, y: current.y };
      break;
    }
  }

  return result;
}

export function hasLineOfSight(p1: Vector2D, p2: Vector2D): boolean {
  for (const wall of MAP_WALLS) {
    if (lineLineIntersection(p1, p2, { x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 })) {
      return false; // wall blocks line of sight
    }
  }
  return true;
}

function circleSegmentCollision(center: Vector2D, radius: number, wall: WallSegment): boolean {
  const { x1, y1, x2, y2 } = wall;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

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
