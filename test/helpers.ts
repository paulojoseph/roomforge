import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addWall, emptyPlan } from '../src/core/model';
import type { Plan } from '../src/core/model';
import { parsePlan } from '../src/core/plan-io';

export const root = join(__dirname, '..');

export function fixtureText(name: string): string {
  return readFileSync(join(root, 'fixtures', 'plans', name + '.json'), 'utf8');
}

export function loadFixture(name: string): Plan {
  return parsePlan(fixtureText(name));
}

/** Rectangle drawn counter clockwise from the origin: w-001 .. w-004. */
export function rectPlan(w = 4000, h = 3000, thickness = 150): Plan {
  let p = emptyPlan('rect');
  const pts = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    p = addWall(p, { x: a[0], y: a[1] }, { x: b[0], y: b[1] }, { thickness });
  }
  return p;
}
