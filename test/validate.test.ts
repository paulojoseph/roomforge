import { describe, expect, it } from 'vitest';
import { addOpening } from '../src/core/model';
import type { Plan } from '../src/core/model';
import { formatReport, validatePlan } from '../src/core/validate';
import { rectPlan } from './helpers';

const messages = (p: Plan) => validatePlan(p).map((x) => x.message);

// clone with a change, so tests don't share state
function edit(p: Plan, fn: (c: Plan) => void): Plan {
  const c = JSON.parse(JSON.stringify(p)) as Plan;
  fn(c);
  return c;
}

describe('validate: clean plans', () => {
  it('reports nothing for a rectangle', () => {
    expect(messages(rectPlan())).toEqual([]);
  });

  it('ends the report with the all-clear line', () => {
    expect(formatReport([])).toEqual(['Validation: no problems found.']);
  });

  it('accepts an opening that ends exactly at the end of the wall', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 3100, { width: 900 });
    expect(messages(p)).toEqual([]);
  });
});

describe('validate: walls', () => {
  it('duplicate wall id', () => {
    const p = edit(rectPlan(), (c) => {
      c.walls[1].id = 'w-001';
    });
    expect(messages(p)).toEqual(['wall id w-001 is used more than once']);
  });

  it('zero length', () => {
    const p = edit(rectPlan(), (c) => {
      c.walls[0].end = { ...c.walls[0].start };
    });
    expect(messages(p)).toEqual(['wall w-001 has zero length']);
  });

  it('value that is not a whole number of millimetres', () => {
    const p = edit(rectPlan(), (c) => {
      c.walls[0].thickness = 150.5;
    });
    expect(messages(p)).toEqual(['wall w-001 has a value that is not a whole number of millimetres']);
  });

  it('thickness too small and too large', () => {
    const thin = edit(rectPlan(), (c) => {
      c.walls[0].thickness = 30;
    });
    const thick = edit(rectPlan(), (c) => {
      c.walls[0].thickness = 700;
    });
    expect(messages(thin)).toEqual(['wall w-001 thickness 30 mm is outside 40-600 mm']);
    expect(messages(thick)).toEqual(['wall w-001 thickness 700 mm is outside 40-600 mm']);
  });

  it('height too small and too large', () => {
    const low = edit(rectPlan(), (c) => {
      c.walls[2].height = 500;
    });
    const high = edit(rectPlan(), (c) => {
      c.walls[2].height = 7000;
    });
    expect(messages(low)).toEqual(['wall w-003 height 500 mm is outside 1000-6000 mm']);
    expect(messages(high)).toEqual(['wall w-003 height 7000 mm is outside 1000-6000 mm']);
  });

  it('gap between two wall ends that should meet', () => {
    const p = edit(rectPlan(), (c) => {
      c.walls[1].start = { x: 4030, y: 0 };
    });
    expect(messages(p)).toEqual(['wall ends of w-001 and w-002 are 30 mm apart']);
  });

  it('does not call a bigger distance a gap', () => {
    const p = edit(rectPlan(), (c) => {
      c.walls[1].start = { x: 4060, y: 0 };
    });
    expect(messages(p)).toEqual([]);
  });
});

describe('validate: openings', () => {
  it('duplicate opening id', () => {
    let p = addOpening(rectPlan(), 'w-001', 'door', 100);
    p = addOpening(p, 'w-001', 'window', 2000);
    p = edit(p, (c) => {
      c.openings[1].id = 'o-001';
    });
    expect(messages(p)).toEqual(['opening id o-001 is used more than once']);
  });

  it('refers to a wall that is not there', () => {
    const p = addOpening(rectPlan(), 'w-099', 'door', 100);
    expect(messages(p)).toEqual(['opening o-001 refers to missing wall w-099']);
  });

  it('value that is not a whole number of millimetres', () => {
    const p = edit(addOpening(rectPlan(), 'w-001', 'door', 100), (c) => {
      c.openings[0].offset = 100.5;
    });
    expect(messages(p)).toEqual(['opening o-001 has a value that is not a whole number of millimetres']);
  });

  it('width outside the limits', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 100, { width: 100 });
    expect(messages(p)).toEqual(['opening o-001 width 100 mm is outside 300-4000 mm']);
  });

  it('height outside the limits', () => {
    const p = addOpening(rectPlan(), 'w-001', 'window', 100, { height: 200, sill: 900 });
    expect(messages(p)).toEqual(['opening o-001 height 200 mm is outside 400-3000 mm']);
  });

  it('sill outside the limits (and then too tall for the wall)', () => {
    const p = addOpening(rectPlan(), 'w-001', 'window', 100, { sill: 2500 });
    expect(messages(p)).toEqual([
      'opening o-001 sill 2500 mm is outside 0-2000 mm',
      'opening o-001 is taller than wall w-001',
    ]);
  });

  it('taller than the wall', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 100, { sill: 700 });
    expect(messages(p)).toEqual(['opening o-001 is taller than wall w-001']);
  });

  it('starts before the wall', () => {
    const p = edit(addOpening(rectPlan(), 'w-001', 'door', 100), (c) => {
      c.openings[0].offset = -100;
    });
    expect(messages(p)).toEqual(['opening o-001 starts before the start of wall w-001']);
  });

  it('runs past the end of the wall', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 3500, { width: 900 });
    expect(messages(p)).toEqual(['opening o-001 runs past the end of wall w-001']);
  });

  it('two openings overlap', () => {
    let p = addOpening(rectPlan(), 'w-001', 'door', 500, { width: 900 });
    p = addOpening(p, 'w-001', 'window', 1200, { width: 900 });
    expect(messages(p)).toEqual(['openings o-001 and o-002 overlap on wall w-001']);
  });
});

describe('validate: report', () => {
  it('counts the problems in the last line', () => {
    const p = edit(rectPlan(), (c) => {
      c.walls[0].thickness = 30;
      c.walls[1].thickness = 30;
    });
    expect(formatReport(validatePlan(p))).toEqual([
      'wall w-001 thickness 30 mm is outside 40-600 mm',
      'wall w-002 thickness 30 mm is outside 40-600 mm',
      'Validation: 2 problems found.',
    ]);
  });

  it('keeps the same wording for one problem', () => {
    const p = edit(rectPlan(), (c) => {
      c.walls[0].thickness = 30;
    });
    const lines = formatReport(validatePlan(p));
    expect(lines[lines.length - 1]).toBe('Validation: 1 problems found.');
  });
});
