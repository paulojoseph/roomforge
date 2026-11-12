import { describe, expect, it } from 'vitest';
import { settings } from '../src/core/settings';

describe('settings', () => {
  it('every range has min below max', () => {
    expect(settings.wall.minThickness).toBeLessThan(settings.wall.maxThickness);
    expect(settings.wall.minHeight).toBeLessThan(settings.wall.maxHeight);
    expect(settings.opening.minWidth).toBeLessThan(settings.opening.maxWidth);
    expect(settings.opening.minHeight).toBeLessThan(settings.opening.maxHeight);
    expect(settings.view.minZoom).toBeLessThan(settings.view.maxZoom);
  });

  it('the defaults sit inside the limits', () => {
    const w = settings.wall;
    expect(w.defaultThickness).toBeGreaterThanOrEqual(w.minThickness);
    expect(w.defaultThickness).toBeLessThanOrEqual(w.maxThickness);
    expect(w.defaultHeight).toBeGreaterThanOrEqual(w.minHeight);
    expect(w.defaultHeight).toBeLessThanOrEqual(w.maxHeight);
  });

  it('the advice limits are positive and a door hint does not fire on the default door', () => {
    const a = settings.advice;
    for (const v of Object.values(a)) expect(v).toBeGreaterThan(0);
    expect(settings.opening.door.width).toBeGreaterThanOrEqual(a.minDoorWidth);
    expect(settings.opening.window.sill).toBeGreaterThanOrEqual(a.minSill);
    expect(settings.wall.defaultThickness).toBeGreaterThan(a.thinWall);
  });
});
