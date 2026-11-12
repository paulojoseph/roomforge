import type { Plan, Point } from './model';
import { distance } from './geometry';
import { settings } from './settings';

export type SnapMode = 'grid' | 'endpoint' | 'angle';

export interface SnapOptions {
  /** Modes to try, in this order. Default: endpoint, angle, grid. */
  modes?: SnapMode[];
  /** Current zoom of the 2D view. */
  zoom?: number;
  /** Start of the wall being drawn, used by the angle mode. */
  anchor?: Point;
}

export interface SnapResult {
  point: Point;
  mode: SnapMode | 'none';
}

// pixels -> mm for the pick radius
const MM_PER_PX = 1 / settings.view.pxPerMmAtZoom1;

/**
 * Snaps a point (mm) to the plan. Three modes, tried in the order given:
 *  - endpoint: the end of an existing wall within the pick radius
 *  - angle: keep the segment from `anchor` on a multiple of 15 degrees
 *  - grid: round to the grid
 * The first mode that hits wins. If none hits the point comes back as is.
 */
export function snap(p: Point, plan: Plan, opts: SnapOptions = {}): SnapResult {
  const modes = opts.modes ?? ['endpoint', 'angle', 'grid'];
  for (const mode of modes) {
    switch (mode) {
      case 'endpoint': {
        const hit = nearestEndpoint(p, plan, settings.snap.pickRadiusPx * MM_PER_PX);
        if (hit) return { point: hit, mode };
        break;
      }
      case 'grid': {
        const g = settings.snap.gridMm;
        return {
          point: { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g },
          mode,
        };
      }
      case 'angle':
        break;
    }
  }
  return { point: p, mode: 'none' };
}

export function nearestEndpoint(p: Point, plan: Plan, radius: number): Point | null {
  let best: Point | null = null;
  let bestD = Infinity;
  for (const w of plan.walls) {
    for (const e of [w.start, w.end]) {
      const d = distance(p, e);
      if (d <= radius && d < bestD) {
        best = e;
        bestD = d;
      }
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
