import type { Plan, Point, Wall } from './model';
import { bounds } from './geometry';
import { settings } from './settings';
import { wallFootprint } from './walls-geometry';

export interface Box {
  min: Point;
  max: Point;
}

export function boxSize(b: Box): { width: number; height: number } {
  return { width: b.max.x - b.min.x, height: b.max.y - b.min.y };
}

export function boxCentre(b: Box): Point {
  return { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 };
}

export function boxContains(b: Box, p: Point): boolean {
  return p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y;
}

export function boxUnion(a: Box, b: Box): Box {
  return {
    min: { x: Math.min(a.min.x, b.min.x), y: Math.min(a.min.y, b.min.y) },
    max: { x: Math.max(a.max.x, b.max.x), y: Math.max(a.max.y, b.max.y) },
  };
}

/** Grows the box by `by` mm on every side (negative shrinks it). */
export function boxGrow(b: Box, by: number): Box {
  return {
    min: { x: b.min.x - by, y: b.min.y - by },
    max: { x: b.max.x + by, y: b.max.y + by },
  };
}

/** Box around the real footprint of one wall, thickness included. */
export function wallExtent(w: Wall): Box {
  // a wall always has 4 footprint corners, so the box is never null
  return bounds(wallFootprint(w)) as Box;
}

/**
 * Box around everything the plan draws. Unlike planBounds() in model.ts, which
 * only looks at the centre-line ends, this one includes the wall thickness.
 */
export function planExtent(plan: Plan): Box | null {
  let out: Box | null = null;
  for (const w of plan.walls) {
    const e = wallExtent(w);
    out = out ? boxUnion(out, e) : e;
  }
  return out;
}

/** Zoom factor (1 = settings.view.pxPerMmAtZoom1) that fits `box` in a viewport, leaving `marginPx` around it. */
export function zoomToFit(box: Box, viewport: { width: number; height: number }, marginPx: number = settings.drawing.fitMarginPx): number {
  const size = boxSize(box);
  const availW = Math.max(1, viewport.width - 2 * marginPx);
  const availH = Math.max(1, viewport.height - 2 * marginPx);
  // a box with no width or height (a single straight wall) fits by the other side
  const sx = size.width > 0 ? availW / size.width : Infinity;
  const sy = size.height > 0 ? availH / size.height : Infinity;
  const pxPerMm = Math.min(sx, sy);
  if (!Number.isFinite(pxPerMm)) return 1;
  const zoom = pxPerMm / settings.view.pxPerMmAtZoom1;
  return Math.min(settings.view.maxZoom, Math.max(settings.view.minZoom, zoom));
}
