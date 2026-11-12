import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePlan, serializePlan } from '../src/core/plan-io';
import { validatePlan } from '../src/core/validate';
import { fixtureText, root } from './helpers';

const names = readdirSync(join(root, 'fixtures', 'plans'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

describe('fixtures', () => {
  it('there are twelve', () => {
    expect(names).toHaveLength(12);
  });

  it.each(names)('%s parses, validates and round-trips', (name) => {
    const text = fixtureText(name);
    const plan = parsePlan(text);
    expect(plan.meta.name).toBe(name);
    expect(validatePlan(plan)).toEqual([]);
    expect(serializePlan(plan)).toBe(text);
  });
});
