// Soft checks. The validator says what is wrong with a plan file; this says
// what is probably not what the person meant, or is awkward to live with.
// Nothing here blocks anything, the editor shows it as hints.

import type { Plan } from './model';
import { wallLength } from './model';
import { area_inner, find_rooms } from './rooms';
import { settings } from './settings';

export type AdviceCode =
  | 'door-narrow'
  | 'opening-near-corner'
  | 'window-low-sill'
  | 'wall-short'
  | 'room-small'
  | 'wall-unsupported-span';

export interface Advice {
  code: AdviceCode;
  message: string;
  wallId?: string;
  openingId?: string;
}

const A = settings.advice;

export function advisePlan(plan: Plan): Advice[] {
  const out: Advice[] = [];

  for (const w of plan.walls) {
    const len = wallLength(w);
    if (len > 0 && len < A.shortWall) {
      out.push({ code: 'wall-short', wallId: w.id, message: `Wall ${w.id} is only ${len} mm long.` });
    }
    if (len > A.longThinWall && w.thickness <= A.thinWall) {
      out.push({
        code: 'wall-unsupported-span',
        wallId: w.id,
        message: `Wall ${w.id} is ${len} mm long and only ${w.thickness} mm thick.`,
      });
    }
  }

  for (const op of plan.openings) {
    const w = plan.walls.find((x) => x.id === op.wallId);
    if (!w) continue;
    if (op.kind === 'door' && op.width < A.minDoorWidth) {
      out.push({
        code: 'door-narrow',
        openingId: op.id,
        wallId: w.id,
        message: `Door ${op.id} is ${op.width} mm wide, under ${A.minDoorWidth} mm.`,
      });
    }
    if (op.kind === 'window' && op.sill < A.minSill) {
      out.push({
        code: 'window-low-sill',
        openingId: op.id,
        wallId: w.id,
        message: `Window ${op.id} starts ${op.sill} mm above the floor.`,
      });
    }
    const rest = wallLength(w) - (op.offset + op.width);
    if (op.offset < A.minEdge || rest < A.minEdge) {
      out.push({
        code: 'opening-near-corner',
        openingId: op.id,
        wallId: w.id,
        message: `Opening ${op.id} is less than ${A.minEdge} mm from the end of ${w.id}.`,
      });
    }
  }

  for (const r of find_rooms(plan)) {
    const inner = area_inner(r, plan);
    if (inner < A.smallRoomMm2) {
      out.push({ code: 'room-small', message: `Room ${r.id} is under 4 m² (${(inner / 1_000_000).toFixed(2)} m²).` });
    }
  }
  return out;
}
