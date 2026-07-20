import { Vector2D } from '../shared/types';
import { MAP_WALLS, MAP_BOUNDS, WallSegment } from '../shared/mapData';

const PLAYER_RADIUS = 16;

export function clampPosition(current: Vector2D, next: Vector2D): Vector2D {
  const margin = PLAYER_RADIUS + 10;
  const minX = margin;
  const maxX = MAP_BOUNDS.width - margin;
  const minY = margin;
  const maxY = MAP_BOUNDS.height - margin;

  let targetX = Math.max(minX, Math.min(maxX, next.x));
  let targetY = Math.max(minY, Math.min(maxY, next.y));

  // Try full move
  if (!checkWallCollision({ x: targetX, y: targetY }, PLAYER_RADIUS)) {
    return { x: targetX, y: targetY };
  }

  // Wall Sliding: try X only
  if (!checkWallCollision({ x: targetX, y: current.y }, PLAYER_RADIUS)) {
    return { x: targetX, y: current.y };
  }

  // Wall Sliding: try Y only
  if (!checkWallCollision({ x: current.x, y: targetY }, PLAYER_RADIUS)) {
    return { x: current.x, y: targetY };
  }

  // Stuck - stay in place
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
    if (lineSegmentIntersect(p1, p2, { x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 })) {
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

function lineSegmentIntersect(a1: Vector2D, a2: Vector2D, b1: Vector2D, b2: Vector2D): boolean {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;

  const det = d1x * d2y - d1y * d2x;
  if (Math.abs(det) < 0.0001) return false;

  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / det;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / det;

  return t > 0 && t < 1 && u > 0 && u < 1;
}
