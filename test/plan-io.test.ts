import { describe, expect, it } from 'vitest';
import { PlanParseError, parsePlan, serializePlan } from '../src/core/plan-io';
import type { Plan } from '../src/core/model';
import { fixtureText } from './helpers';

// parsed once, reused below
let cached: Plan;

describe('plan-io', () => {
  it('parses the studio fixture', () => {
    cached = parsePlan(fixtureText('studio-30'));
    expect(cached.meta.name).toBe('studio-30');
    expect(cached.walls).toHaveLength(4);
    expect(cached.openings).toHaveLength(3);
  });

  it('writes back exactly the text it read', () => {
    expect(serializePlan(cached)).toBe(fixtureText('studio-30'));
  });

  it('refuses text that is not JSON', () => {
    expect(() => parsePlan('{nope')).toThrow(PlanParseError);
    expect(() => parsePlan('{nope')).toThrow('file is not valid JSON');
  });

  it('refuses a plan without walls', () => {
    const bad = JSON.stringify({ meta: { name: 'x', units: 'mm' }, openings: [] });
    expect(() => parsePlan(bad)).toThrow('walls must be an array');
  });

  it('refuses unknown units and unknown opening kinds', () => {
    const units = JSON.stringify({ meta: { name: 'x', units: 'ft' }, walls: [], openings: [] });
    expect(() => parsePlan(units)).toThrow('meta.units must be mm, cm or m');
    const kind = JSON.stringify({
      meta: { name: 'x', units: 'mm' },
      walls: [],
      openings: [{ id: 'o-001', wallId: 'w-001', kind: 'gate', offset: 0, width: 900, height: 2100, sill: 0 }],
    });
    expect(() => parsePlan(kind)).toThrow('openings[0].kind must be door or window');
  });

  it('serializes an empty plan with empty arrays', () => {
    const text = serializePlan({ meta: { name: 'e', units: 'mm' }, walls: [], openings: [] });
    expect(text).toBe('{\n  "meta": {"name": "e", "units": "mm"},\n  "walls": [],\n  "openings": []\n}\n');
  });
});
