import { describe, expect, it } from 'vitest';
import { computeVisibilityPolygon } from '../src/shared/visibility';
import { WallSegment } from '../src/shared/mapData';

describe('Security camera wall occlusion', () => {
  it('stops every forward ray at an uninterrupted wall', () => {
    const wall: WallSegment = { x1: 50, y1: -100, x2: 50, y2: 100 };
    const polygon = computeVisibilityPolygon(
      { x: 0, y: 0 },
      0,
      Math.PI / 2,
      120,
      [wall]
    );

    expect(Math.max(...polygon.slice(1).map(point => point.x))).toBeCloseTo(50, 4);
  });

  it('keeps the view open through a doorway gap', () => {
    const walls: WallSegment[] = [
      { x1: 50, y1: -100, x2: 50, y2: -12 },
      { x1: 50, y1: 12, x2: 50, y2: 100 }
    ];
    const polygon = computeVisibilityPolygon(
      { x: 0, y: 0 },
      0,
      Math.PI / 2,
      120,
      walls
    );
    const centerRay = polygon.find(point => Math.abs(point.y) < 0.001 && point.x > 0);

    expect(centerRay?.x).toBeCloseTo(120, 4);
    expect(polygon.some(point => point.x <= 50.01)).toBe(true);
  });
});
