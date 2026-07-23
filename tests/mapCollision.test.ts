import { describe, expect, it } from 'vitest';
import { clampPosition, checkWallCollision } from '../src/shared/mapCollision';
import {
  CAMERA_CONSOLE,
  MAP_BOUNDS,
  MAP_OBSTACLES,
  SPAWN_POINTS,
  TASK_DEFINITIONS,
  SECURITY_CAMERAS,
  VENTS
} from '../src/shared/mapData';

describe('Map collision and task reachability', () => {
  it('prevents tunnelling through a wall on a large movement update', () => {
    const start = { x: 400, y: 610 };
    const attemptedJump = { x: 400, y: 500 };
    const result = clampPosition(start, attemptedJump);

    expect(result.y).toBeGreaterThanOrEqual(576);
    expect(checkWallCollision(result, 16)).toBe(false);
  });

  it('blocks large furniture from the supplied floor plan', () => {
    const car = MAP_OBSTACLES.find(obstacle => obstacle.id === 'garage_car_w')!;
    expect(checkWallCollision({
      x: car.x + car.width / 2,
      y: car.y + car.height / 2
    }, 16)).toBe(true);
  });

  it('keeps every task, vent and camera console reachable from the central corridor spawn', () => {
    const gridSize = 20;
    const key = (x: number, y: number) => `${Math.round(x / gridSize)},${Math.round(y / gridSize)}`;
    const start = SPAWN_POINTS[0];
    const queue: Array<[number, number]> = [[
      Math.round(start.x / gridSize) * gridSize,
      Math.round(start.y / gridSize) * gridSize
    ]];
    const visited = new Set([key(queue[0][0], queue[0][1])]);

    for (let index = 0; index < queue.length; index++) {
      const [x, y] = queue[index];
      for (const [dx, dy] of [[gridSize, 0], [-gridSize, 0], [0, gridSize], [0, -gridSize]]) {
        const nextX = x + dx;
        const nextY = y + dy;
        const nextKey = key(nextX, nextY);
        if (
          nextX < gridSize ||
          nextY < gridSize ||
          nextX > MAP_BOUNDS.width - gridSize ||
          nextY > MAP_BOUNDS.height - gridSize ||
          visited.has(nextKey) ||
          checkWallCollision({ x: nextX, y: nextY }, 16)
        ) {
          continue;
        }
        visited.add(nextKey);
        queue.push([nextX, nextY]);
      }
    }

    for (const interactable of [...TASK_DEFINITIONS, ...VENTS, CAMERA_CONSOLE]) {
      const reachable = [-40, -20, 0, 20, 40].some(dx =>
        [-40, -20, 0, 20, 40].some(dy => visited.has(key(interactable.x + dx, interactable.y + dy)))
      );
      expect(reachable, `${interactable.id} should be reachable`).toBe(true);
    }

    for (const camera of SECURITY_CAMERAS) {
      expect(camera.viewX).toBeGreaterThan(0);
      expect(camera.viewX).toBeLessThan(MAP_BOUNDS.width);
      expect(camera.viewY).toBeGreaterThan(0);
      expect(camera.viewY).toBeLessThan(MAP_BOUNDS.height);
    }
  });
});
