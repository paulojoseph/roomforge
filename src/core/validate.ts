import { settings } from './settings';
import { wallLength } from './model';
import type { Opening, Plan, Wall } from './model';
import { distance, samePoint } from './geometry';

export type ProblemCode =
  | 'duplicate-wall-id'
  | 'duplicate-opening-id'
  | 'wall-zero-length'
  | 'wall-not-integer'
  | 'wall-thickness'
  | 'wall-height'
  | 'opening-missing-wall'
  | 'opening-not-integer'
  | 'opening-width'
  | 'opening-height'
  | 'opening-sill'
  | 'opening-before-start'
  | 'opening-past-end'
  | 'opening-too-tall'
  | 'opening-overlap'
  | 'wall-gap';

export interface Problem {
  code: ProblemCode;
  message: string;
  wallId?: string;
  openingId?: string;
}

const W = settings.wall;
const O = settings.opening;

export function validatePlan(plan: Plan): Problem[] {
  const out: Problem[] = [];
  checkDuplicateIds(plan, out);
  plan.walls.forEach((w) => checkWall(w, out));
  checkOpenings(plan, out);
  checkJoins(plan, out);
  return out;
}

/** One line per problem, then the summary line the CLI ends with. */
export function formatReport(problems: Problem[]): string[] {
  const lines = problems.map((p) => p.message);
  if (problems.length === 0) {
    lines.push('Validation: no problems found.');
  } else {
    lines.push(`Validation: ${problems.length} problems found.`);
  }
  return lines;
}

function checkDuplicateIds(plan: Plan, out: Problem[]): void {
  const seenW = new Set<string>();
  const dupW = new Set<string>();
  for (const w of plan.walls) {
    if (seenW.has(w.id) && !dupW.has(w.id)) {
      dupW.add(w.id);
      out.push({
        code: 'duplicate-wall-id',
        message: `wall id ${w.id} is used more than once`,
        wallId: w.id,
      });
    }
    seenW.add(w.id);
  }
  const seenO = new Set<string>();
  const dupO = new Set<string>();
  for (const o of plan.openings) {
    if (seenO.has(o.id) && !dupO.has(o.id)) {
      dupO.add(o.id);
      out.push({
        code: 'duplicate-opening-id',
        message: `opening id ${o.id} is used more than once`,
        openingId: o.id,
      });
    }
    seenO.add(o.id);
  }
}

function checkWall(w: Wall, out: Problem[]): void {
  const nums = [w.start.x, w.start.y, w.end.x, w.end.y, w.thickness, w.height];
  if (!nums.every((n) => Number.isInteger(n))) {
    out.push({
      code: 'wall-not-integer',
      message: `wall ${w.id} has a value that is not a whole number of millimetres`,
      wallId: w.id,
    });
  }
  if (samePoint(w.start, w.end)) {
    out.push({ code: 'wall-zero-length', message: `wall ${w.id} has zero length`, wallId: w.id });
  }
  if (w.thickness < W.minThickness || w.thickness > W.maxThickness) {
    out.push({
      code: 'wall-thickness',
      message: `wall ${w.id} thickness ${w.thickness} mm is outside ${W.minThickness}-${W.maxThickness} mm`,
      wallId: w.id,
    });
  }
  if (w.height < W.minHeight || w.height > W.maxHeight) {
    out.push({
      code: 'wall-height',
      message: `wall ${w.id} height ${w.height} mm is outside ${W.minHeight}-${W.maxHeight} mm`,
      wallId: w.id,
    });
  }
}

function checkOpenings(plan: Plan, out: Problem[]): void {
  const byId = new Map<string, Wall>();
  for (const w of plan.walls) if (!byId.has(w.id)) byId.set(w.id, w);

  const placed: { op: Opening; wall: Wall }[] = [];

  for (const op of plan.openings) {
    const wall = byId.get(op.wallId);
    if (!wall) {
      out.push({
        code: 'opening-missing-wall',
        message: `opening ${op.id} refers to missing wall ${op.wallId}`,
        openingId: op.id,
      });
      continue;
    }
    placed.push({ op, wall });

    const nums = [op.offset, op.width, op.height, op.sill];
    if (!nums.every((n) => Number.isInteger(n))) {
      out.push({
        code: 'opening-not-integer',
        message: `opening ${op.id} has a value that is not a whole number of millimetres`,
        openingId: op.id,
      });
    }
    if (op.width < O.minWidth || op.width > O.maxWidth) {
      out.push({
        code: 'opening-width',
        message: `opening ${op.id} width ${op.width} mm is outside ${O.minWidth}-${O.maxWidth} mm`,
        openingId: op.id,
      });
    }
    if (op.height < O.minHeight || op.height > O.maxHeight) {
      out.push({
        code: 'opening-height',
        message: `opening ${op.id} height ${op.height} mm is outside ${O.minHeight}-${O.maxHeight} mm`,
        openingId: op.id,
      });
    }
    if (op.sill < 0 || op.sill > O.maxSill) {
      out.push({
        code: 'opening-sill',
        message: `opening ${op.id} sill ${op.sill} mm is outside 0-${O.maxSill} mm`,
        openingId: op.id,
      });
    }
    if (op.sill + op.height > wall.height) {
      out.push({
        code: 'opening-too-tall',
        message: `opening ${op.id} is taller than wall ${wall.id}`,
        openingId: op.id,
      });
    }

    const len = wallLength(wall);
    if (op.offset < 0) {
      out.push({
        code: 'opening-before-start',
        message: `opening ${op.id} starts before the start of wall ${wall.id}`,
        openingId: op.id,
      });
    }
    // signed reach of the far edge along the wall's main (x) axis
    const dir = Math.sign(wall.end.x - wall.start.x) || 1;
    const reach = dir * (op.offset + op.width);
    if (reach > len) {
      out.push({
        code: 'opening-past-end',
        message: `opening ${op.id} runs past the end of wall ${wall.id}`,
        openingId: op.id,
      });
    }
  }

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.wall.id !== b.wall.id) continue;
      const aEnd = a.op.offset + a.op.width;
      const bEnd = b.op.offset + b.op.width;
      if (a.op.offset < bEnd && b.op.offset < aEnd) {
        out.push({
          code: 'opening-overlap',
          message: `openings ${a.op.id} and ${b.op.id} overlap on wall ${a.wall.id}`,
          openingId: a.op.id,
        });
      }
    }
  }
}

function checkJoins(plan: Plan, out: Problem[]): void {
  const ends: { wall: Wall; p: { x: number; y: number } }[] = [];
  for (const w of plan.walls) {
    ends.push({ wall: w, p: w.start });
    ends.push({ wall: w, p: w.end });
  }
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const a = ends[i];
      const b = ends[j];
      if (a.wall === b.wall) continue;
      if (Math.abs(a.p.x - b.p.x) > settings.join.gapMm) continue;
      const d = distance(a.p, b.p);
      if (d > 0 && d <= settings.join.gapMm) {
        out.push({
          code: 'wall-gap',
          message: `wall ends of ${a.wall.id} and ${b.wall.id} are ${d} mm apart`,
          wallId: a.wall.id,
        });
      }
    }
  }
}
