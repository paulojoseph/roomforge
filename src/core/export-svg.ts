// Plan as a standalone SVG: walls, doors with their swing, windows, room
// labels and optionally dimension lines. Plain text out, same text for the
// same plan (no dates, no random ids), y is flipped so north is up.

import type { Opening, Plan, Point, Wall } from './model';
import { wallLength } from './model';
import { leftNormal, unit } from './geometry';
import { boxGrow, boxSize, planExtent } from './bounds';
import type { Box } from './bounds';
import { openingDimensions, wallDimensions } from './dimensions';
import { formatArea } from './format';
import { pointOnWall } from './openings';
import { settings } from './settings';
import { area_inner, find_rooms } from './rooms';
import { wallFootprint } from './walls-geometry';

export interface SvgOptions {
  /** output pixels per millimetre, default settings.drawing.pxPerMm (1 px = 10 mm) */
  pxPerMm?: number;
  /** empty border around the drawing, mm */
  margin?: number;
  /** label every room with its id and inner area */
  rooms?: boolean;
  /** dimension lines for walls and openings */
  dimensions?: boolean;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 1 decimal at most, no trailing zeros, no "-0". */
function num(n: number): string {
  const s = n.toFixed(1);
  const t = s.endsWith('.0') ? s.slice(0, -2) : s;
  return t === '-0' ? '0' : t;
}

export function exportSvg(plan: Plan, opts: SvgOptions = {}): string {
  const k = opts.pxPerMm ?? settings.drawing.pxPerMm;
  const margin = opts.margin ?? settings.drawing.marginMm;
  const extent = planExtent(plan);

  if (!extent) {
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80">',
      `  <title>${esc(plan.meta.name)}</title>`,
      '  <text x="120" y="44" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#666">empty plan</text>',
      '</svg>',
      '',
    ].join('\n');
  }

  const view: Box = boxGrow(extent, margin + (opts.dimensions ? 500 : 0));
  const size = boxSize(view);
  const X = (x: number) => num((x - view.min.x) * k);
  const Y = (y: number) => num((view.max.y - y) * k);
  const P = (p: Point) => `${X(p.x)},${Y(p.y)}`;

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(size.width * k)}" height="${num(size.height * k)}" ` +
      `viewBox="0 0 ${num(size.width * k)} ${num(size.height * k)}">`,
  );
  out.push(`  <title>${esc(plan.meta.name)}</title>`);
  out.push('  <rect width="100%" height="100%" fill="#ffffff"/>');

  out.push('  <g id="walls" fill="#2b2b2b" stroke="#2b2b2b" stroke-width="0.5">');
  for (const w of plan.walls) {
    out.push(`    <polygon data-id="${esc(w.id)}" points="${wallFootprint(w).map(P).join(' ')}"/>`);
  }
  out.push('  </g>');

  out.push('  <g id="openings" fill="#ffffff" stroke="#2b2b2b" stroke-width="1">');
  for (const op of plan.openings) {
    const w = plan.walls.find((x) => x.id === op.wallId);
    if (!w || wallLength(w) === 0) continue;
    out.push(...openingMarkup(w, op, P, k));
  }
  out.push('  </g>');

  if (opts.rooms) {
    out.push('  <g id="rooms" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#1a4d8f">');
    for (const r of find_rooms(plan)) {
      // average of the corners: good for boxes, can fall outside an L shaped room
      const c = r.poly.reduce((s, p) => ({ x: s.x + p.x / r.poly.length, y: s.y + p.y / r.poly.length }), { x: 0, y: 0 });
      out.push(`    <text x="${X(c.x)}" y="${Y(c.y)}">${esc(r.id)} ${formatArea(area_inner(r, plan))} m²</text>`);
    }
    out.push('  </g>');
  }

  if (opts.dimensions) {
    out.push('  <g id="dimensions" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#7a3b00" stroke="#7a3b00" stroke-width="0.6">');
    for (const d of [...wallDimensions(plan), ...openingDimensions(plan)]) {
      out.push(`    <line x1="${X(d.from.x)}" y1="${Y(d.from.y)}" x2="${X(d.to.x)}" y2="${Y(d.to.y)}"/>`);
      out.push(`    <line x1="${X(d.a.x)}" y1="${Y(d.a.y)}" x2="${X(d.from.x)}" y2="${Y(d.from.y)}" stroke-dasharray="2 2"/>`);
      out.push(`    <line x1="${X(d.b.x)}" y1="${Y(d.b.y)}" x2="${X(d.to.x)}" y2="${Y(d.to.y)}" stroke-dasharray="2 2"/>`);
      // plan angles turn counter clockwise, SVG rotates clockwise
      out.push(
        `    <text stroke="none" transform="translate(${X(d.label.x)} ${Y(d.label.y)}) rotate(${num(-d.angle)})" dy="-3">${d.value}</text>`,
      );
    }
    out.push('  </g>');
  }

  out.push('</svg>', '');
  return out.join('\n');
}

/** A gap in the wall, plus the leaf and its swing for a door or the glass line for a window. */
function openingMarkup(w: Wall, op: Opening, P: (p: Point) => string, k: number): string[] {
  const d = unit(w.start, w.end);
  const n = leftNormal(d);
  const half = w.thickness / 2;
  const a = pointOnWall(w, op.offset);
  const b = pointOnWall(w, op.offset + op.width);
  const corner = (p: Point, s: number): Point => ({ x: p.x + n.x * half * s, y: p.y + n.y * half * s });
  const gap = [corner(a, -1), corner(b, -1), corner(b, 1), corner(a, 1)];
  const out = [`    <polygon data-id="${esc(op.id)}" stroke="none" points="${gap.map(P).join(' ')}"/>`];

  const [ax, ay] = P(a).split(',');
  const [bx, by] = P(b).split(',');
  if (op.kind === 'window') {
    out.push(`    <line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`);
    return out;
  }

  // door: hinge at the near edge, leaf open 90 degrees towards the left of the wall
  const leafEnd = { x: a.x + n.x * op.width, y: a.y + n.y * op.width };
  const [lx, ly] = P(leafEnd).split(',');
  const r = num(op.width * k);
  out.push(`    <line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly}"/>`);
  // going from the leaf to the jamb is clockwise on the drawing
  out.push(`    <path fill="none" d="M ${lx} ${ly} A ${r} ${r} 0 0 1 ${bx} ${by}"/>`);
  return out;
}
