import type { Opening, Plan, Point, Wall } from './model';
import { planBounds } from './model';

function mapPoints(plan: Plan, f: (p: Point) => Point): Plan {
  return {
    ...plan,
    walls: plan.walls.map((w): Wall => ({ ...w, start: f(w.start), end: f(w.end) })),
  };
}

export function translatePlan(plan: Plan, dx: number, dy: number): Plan {
  const mx = Math.round(dx);
  const my = Math.round(dy);
  if (mx === 0 && my === 0) return plan;
  return mapPoints(plan, (p) => ({ x: p.x + mx, y: p.y + my }));
}

/** Moves the plan so the lower left corner of its centre lines sits at (0, 0). */
export function moveToOrigin(plan: Plan): Plan {
  const b = planBounds(plan);
  if (!b) return plan;
  return translatePlan(plan, -b.min.x, -b.min.y);
}

/**
 * Rotates counter clockwise (y up) by `deg` around `about`. Multiples of 90
 * degrees are exact. Other angles round every end to a whole millimetre, so a
 * wall can end up 1 mm longer or shorter and an opening near the end of a wall
 * may then overrun it.
 */
export function rotatePlan(plan: Plan, deg: number, about: Point = { x: 0, y: 0 }): Plan {
  const turns = ((deg % 360) + 360) % 360;
  if (turns === 0) return plan;

  let cos: number;
  let sin: number;
  if (turns % 90 === 0) {
    const q = turns / 90;
    cos = [1, 0, -1, 0][q];
    sin = [0, 1, 0, -1][q];
  } else {
    const rad = (turns * Math.PI) / 180;
    cos = Math.cos(rad);
    sin = Math.sin(rad);
  }

  return mapPoints(plan, (p) => {
    const x = p.x - about.x;
    const y = p.y - about.y;
    return {
      x: Math.round(about.x + x * cos - y * sin),
      y: Math.round(about.y + x * sin + y * cos),
    };
  });
}

/**
 * Mirrors the plan. axis 'x' flips left and right around the vertical line
 * x = at, axis 'y' flips top and bottom around y = at.
 *
 * Wall directions are kept (start stays start), so opening offsets stay valid.
 * A mirrored plan runs the other way round: loops drawn counter clockwise
 * become clockwise.
 */
export function mirrorPlan(plan: Plan, axis: 'x' | 'y', at = 0): Plan {
  const k = Math.round(at);
  return mapPoints(plan, (p) => (axis === 'x' ? { x: 2 * k - p.x, y: p.y } : { x: p.x, y: 2 * k - p.y }));
}

/**
 * Scales positions, opening offsets and opening widths by `k`. Thickness,
 * heights and sills stay as they are, a bigger plan does not get fatter walls.
 */
export function scalePlan(plan: Plan, k: number): Plan {
  if (!(k > 0) || !Number.isFinite(k)) throw new RangeError('scale factor must be a positive number');
  const r = (n: number) => Math.round(n * k);
  const walls = plan.walls.map((w): Wall => ({
    ...w,
    start: { x: r(w.start.x), y: r(w.start.y) },
    end: { x: r(w.end.x), y: r(w.end.y) },
  }));
  const openings = plan.openings.map((o): Opening => ({ ...o, offset: r(o.offset), width: r(o.width) }));
  return { ...plan, walls, openings };
}
