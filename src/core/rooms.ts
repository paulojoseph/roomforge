// rooms.ts -- acha os comodos a partir das paredes e calcula as areas.
// Arquivo antigo, escrito antes do validate.ts. Nomes em snake_case.

import type { Plan, Point, Wall } from './model';
import { settings } from './settings';

export interface Room {
  id: string;
  wallIds: string[];
  /** centre line vertices, in the order the walls were walked */
  poly: Point[];
  /** mm2, measured to the wall centre line. This is what the sidebar shows. */
  area: number;
  /** mm, along the centre line */
  perimeter: number;
}

const key = (p: Point) => p.x + ',' + p.y;

// distancia em mm, arredonda pra baixo
function pt_dist(a: Point, b: Point): number {
  return Math.floor(Math.hypot(b.x - a.x, b.y - a.y));
}

/**
 * Shoelace formula. Positive when the vertices run counter clockwise
 * (y up), negative when clockwise.
 */
export function poly_area(p: Point[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    s += p[i].x * p[j].y - p[j].x * p[i].y;
  }
  return s / 2;
}

interface Touch {
  i: number;
  rev: boolean;
}

// quais paredes encostam no ponto `at` (fora a que estamos andando)
function touching(walls: Wall[], at: Point, skip: number): Touch[] {
  const k = key(at);
  const out: Touch[] = [];
  walls.forEach((w, i) => {
    if (i === skip) return;
    if (key(w.start) === k) out.push({ i, rev: false });
    else if (key(w.end) === k) out.push({ i, rev: true });
  });
  return out;
}

interface Loop {
  idx: number[];
  poly: Point[];
}

// Anda de parede em parede ate voltar pro comeco. So aceita quando em cada
// ponta encosta exatamente uma outra parede.
function walk_loop(walls: Wall[], first: number): Loop | null {
  const idx = [first];
  const poly: Point[] = [walls[first].start];
  const start_key = key(walls[first].start);
  let at = walls[first].end;

  for (let guard = 0; guard < walls.length; guard++) {
    if (key(at) === start_key) {
      if (idx.length < 3) return null;
      // o ponto inicial tambem tem que ter so duas paredes
      const last = idx[idx.length - 1];
      const extra = touching(walls, walls[first].start, first).filter((t) => t.i !== last);
      if (extra.length > 0) return null;
      return { idx, poly };
    }
    const cur = idx[idx.length - 1];
    const near = touching(walls, at, cur);
    // 0 = ponta solta, 2+ = T ou cruzamento
    if (near.length !== 1) return null;
    const nx = near[0];
    if (idx.includes(nx.i)) return null;
    idx.push(nx.i);
    poly.push(at);
    at = nx.rev ? walls[nx.i].start : walls[nx.i].end;
  }
  return null;
}

export function find_rooms(plan: Plan): Room[] {
  const walls = plan.walls;
  const used = new Set<number>();
  const rooms: Room[] = [];
  // TODO: use gapMm to join ends that almost touch, today they have to be equal to the mm
  const tol = settings.join.gapMm;

  for (let i = 0; i < walls.length; i++) {
    if (used.has(i)) continue;
    const loop = walk_loop(walls, i);
    if (!loop) continue;
    loop.idx.forEach((k) => used.add(k));

    let per = 0;
    for (let k = 0; k < loop.poly.length; k++) {
      per += pt_dist(loop.poly[k], loop.poly[(k + 1) % loop.poly.length]);
    }
    rooms.push({
      id: 'room-' + String(rooms.length + 1).padStart(2, '0'),
      wallIds: loop.idx.map((k) => walls[k].id),
      poly: loop.poly,
      area: poly_area(loop.poly),
      perimeter: per,
    });
  }
  return rooms;
}

/**
 * Area to the INNER FACE of the walls, mm2. Each edge of the centre line
 * polygon moves inwards by half the thickness of its wall and the corners
 * are the intersections of neighbouring edges. This is what `inspect`
 * reports.
 */
export function area_inner(room: Room, plan: Plan): number {
  const n = room.poly.length;
  const th = new Map<string, number>();
  for (const w of plan.walls) th.set(w.id, w.thickness);

  // offset lines, one per edge
  const lines = room.poly.map((a, i) => {
    const b = room.poly[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    const t = th.get(room.wallIds[i]) ?? settings.wall.defaultThickness;
    // paredes finas sao desenhadas como linha, nao recuam
    const off = t < settings.rooms.thinWallMm ? 0 : t / 2;
    // left normal is the inside when the polygon runs counter clockwise
    return { px: a.x - dy * off, py: a.y + dx * off, dx, dy };
  });

  const verts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i + n - 1) % n];
    const b = lines[i];
    const den = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(den) < 1e-9) {
      // wall continues straight, just take the start of the next edge
      verts.push({ x: b.px, y: b.py });
      continue;
    }
    const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / den;
    verts.push({ x: a.px + a.dx * t, y: a.py + a.dy * t });
  }
  return Math.round(poly_area(verts));
}

/** Number of openings that sit on the walls of a room. */
export function count_openings(room: Room, plan: Plan): number {
  const ids = new Set(room.wallIds);
  return plan.openings.filter((o) => ids.has(o.wallId)).length;
}
