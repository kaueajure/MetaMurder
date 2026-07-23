import { Vector2D } from './types';
import {
  BUILDING_BOUNDS,
  MAP_WALLS,
  MAP_BOUNDS,
  MAP_OBSTACLES,
  ObstacleRect,
  WallSegment
} from './mapData';

export const PLAYER_COLLISION_RADIUS = 16;
const MAX_SWEEP_STEP = 6;

/**
 * Moves a player through a sequence of small collision-checked steps.
 * Sweeping the complete segment prevents a large client update from ending on
 * the far side of a wall ("tunnelling").
 */
export function clampPosition(current: Vector2D, next: Vector2D): Vector2D {
  const margin = PLAYER_COLLISION_RADIUS + 10;
  const boundedTarget = {
    x: Math.max(margin, Math.min(MAP_BOUNDS.width - margin, next.x)),
    y: Math.max(margin, Math.min(MAP_BOUNDS.height - margin, next.y))
  };

  const dx = boundedTarget.x - current.x;
  const dy = boundedTarget.y - current.y;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_SWEEP_STEP));
  const stepX = dx / steps;
  const stepY = dy / steps;
  let position = { ...current };

  for (let step = 0; step < steps; step++) {
    const target = {
      x: position.x + stepX,
      y: position.y + stepY
    };

    if (!checkWallCollision(target, PLAYER_COLLISION_RADIUS)) {
      position = target;
      continue;
    }

    const xOnly = { x: target.x, y: position.y };
    const yOnly = { x: position.x, y: target.y };

    if (!checkWallCollision(xOnly, PLAYER_COLLISION_RADIUS)) {
      position = xOnly;
    } else if (!checkWallCollision(yOnly, PLAYER_COLLISION_RADIUS)) {
      position = yOnly;
    }
  }

  return position;
}

/**
 * Ghosts are allowed to cross walls and furniture, but remain inside the
 * office footprint so the camera never escapes into the infinite void.
 */
export function clampGhostPosition(next: Vector2D): Vector2D {
  const margin = PLAYER_COLLISION_RADIUS;
  return {
    x: Math.max(
      BUILDING_BOUNDS.x + margin,
      Math.min(BUILDING_BOUNDS.x + BUILDING_BOUNDS.width - margin, next.x)
    ),
    y: Math.max(
      BUILDING_BOUNDS.y + margin,
      Math.min(BUILDING_BOUNDS.y + BUILDING_BOUNDS.height - margin, next.y)
    )
  };
}

export function checkWallCollision(center: Vector2D, radius: number): boolean {
  return (
    MAP_WALLS.some(wall => circleSegmentCollision(center, radius, wall)) ||
    MAP_OBSTACLES.some(obstacle => circleRectCollision(center, radius, obstacle))
  );
}

export function hasLineOfSight(p1: Vector2D, p2: Vector2D): boolean {
  return (
    !MAP_WALLS.some(wall =>
      lineSegmentIntersect(p1, p2, { x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 })
    ) &&
    !MAP_OBSTACLES.some(obstacle => lineRectIntersect(p1, p2, obstacle))
  );
}

function circleSegmentCollision(center: Vector2D, radius: number, wall: WallSegment): boolean {
  const { x1, y1, x2, y2 } = wall;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return false;

  const projection = ((center.x - x1) * dx + (center.y - y1) * dy) / lenSq;
  const u = Math.max(0, Math.min(1, projection));
  const nearestX = x1 + u * dx;
  const nearestY = y1 + u * dy;
  const distX = center.x - nearestX;
  const distY = center.y - nearestY;

  return (distX * distX + distY * distY) < radius * radius;
}

function circleRectCollision(center: Vector2D, radius: number, rect: ObstacleRect): boolean {
  const nearestX = Math.max(rect.x, Math.min(center.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(center.y, rect.y + rect.height));
  const dx = center.x - nearestX;
  const dy = center.y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function lineRectIntersect(start: Vector2D, end: Vector2D, rect: ObstacleRect): boolean {
  const topLeft = { x: rect.x, y: rect.y };
  const topRight = { x: rect.x + rect.width, y: rect.y };
  const bottomLeft = { x: rect.x, y: rect.y + rect.height };
  const bottomRight = { x: rect.x + rect.width, y: rect.y + rect.height };
  return (
    lineSegmentIntersect(start, end, topLeft, topRight) ||
    lineSegmentIntersect(start, end, topRight, bottomRight) ||
    lineSegmentIntersect(start, end, bottomRight, bottomLeft) ||
    lineSegmentIntersect(start, end, bottomLeft, topLeft)
  );
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
