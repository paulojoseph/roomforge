import { describe, expect, it } from 'vitest';
import { PlanParseError, parsePlan } from '../src/core/plan-io';
import { upgradePlan } from '../src/core/migrate';
import { validatePlan } from '../src/core/validate';
import { fixtureText } from './helpers';

const LEGACY = JSON.stringify({
  name: 'old house',
  walls: [{ start: { x: 0, y: 0 }, end: { x: 3000.4, y: 0 } }],
  doors: [{ wallId: 'w-001', offset: 100 }],
  windows: [{ wallId: 'w-001', offset: 1500, width: 1000 }],
});

describe('upgradePlan', () => {
  it('leaves a current file exactly as parsePlan reads it, with no notes', () => {
    const text = fixtureText('studio-30');
    const r = upgradePlan(text);
    expect(r.notes).toEqual([]);
    expect(r.plan).toEqual(parsePlan(text));
  });

  it('reads a 0.1 file and says what it did', () => {
    const r = upgradePlan(LEGACY);
    expect(r.plan.meta).toEqual({ name: 'old house', units: 'mm' });
    expect(r.plan.walls).toEqual([
      { id: 'w-001', start: { x: 0, y: 0 }, end: { x: 3000, y: 0 }, thickness: 150, height: 2700 },
    ]);
    expect(r.plan.openings).toEqual([
      { id: 'o-001', wallId: 'w-001', kind: 'door', offset: 100, width: 900, height: 2100, sill: 0 },
      { id: 'o-002', wallId: 'w-001', kind: 'window', offset: 1500, width: 1000, height: 1200, sill: 900 },
    ]);
    expect(r.notes).toEqual([
      'name moved into meta',
      'no units, assuming mm',
      '1 walls without thickness or height, defaults used',
      'doors and windows merged into openings',
      '2 openings without a sill, default used',
      '1 coordinates were not whole millimetres and were rounded',
    ]);
  });

  it('gives a plan the validator is happy with', () => {
    expect(validatePlan(upgradePlan(LEGACY).plan)).toEqual([]);
  });

  it('names an unnamed plan and reads an opening without a kind as a door', () => {
    const r = upgradePlan(
      JSON.stringify({
        meta: { units: 'cm' },
        walls: [{ id: 'a', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, thickness: 15, height: 270 }],
        openings: [{ wallId: 'a', offset: 10 }],
      }),
    );
    expect(r.plan.meta).toEqual({ name: 'untitled', units: 'cm' });
    expect(r.plan.openings[0].kind).toBe('door');
    expect(r.notes).toEqual([
      'no plan name, using "untitled"',
      '1 openings without a kind, read as doors',
      '1 openings without a sill, default used',
    ]);
  });

  it('numbers walls that have no id by position', () => {
    const r = upgradePlan(JSON.stringify({ walls: [{ start: { x: 0, y: 0 }, end: { x: 5, y: 0 } }, { start: { x: 5, y: 0 }, end: { x: 5, y: 5 } }] }));
    expect(r.plan.walls.map((w) => w.id)).toEqual(['w-001', 'w-002']);
  });

  it('still rejects what it cannot guess', () => {
    expect(() => upgradePlan('{')).toThrow(PlanParseError);
    expect(() => upgradePlan('[]')).toThrow('plan must be a JSON object');
    expect(() => upgradePlan('{"name":"x"}')).toThrow('walls must be an array');
    expect(() => upgradePlan('{"walls":[{"start":{"x":0}}]}')).toThrow('walls[0].start must have numeric x and y');
    expect(() => upgradePlan('{"walls":[],"openings":[{"offset":1}]}')).toThrow('openings[0].wallId must be a string');
    expect(() => upgradePlan('{"walls":[],"openings":[{"wallId":"w","offset":"1"}]}')).toThrow('openings[0].offset must be a number');
  });
});
