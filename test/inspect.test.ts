import { describe, expect, it } from 'vitest';
import { inspectPlan } from '../src/core/inspect';
import { emptyPlan } from '../src/core/model';
import { loadFixture } from './helpers';

describe('inspect', () => {
  it('starts with the plan name and the counts', () => {
    const lines = inspectPlan(loadFixture('studio-30')).split('\n');
    expect(lines[0]).toBe('plan: studio-30');
    expect(lines[1]).toBe('walls: 4  openings: 3  rooms: 1');
  });

  it('prints one row per room and the total', () => {
    const text = inspectPlan(loadFixture('apartment-2br'));
    expect(text).toContain('room-01  19.11     18.000       4      2');
    expect(text).toContain('total area: 58.54 m2 (inner face)');
  });

  it('says so when there is no closed room', () => {
    const text = inspectPlan(emptyPlan('nothing'));
    expect(text).toBe('plan: nothing\nwalls: 0  openings: 0  rooms: 0\n\nno closed rooms found\n');
  });
});
