'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addOpening, addWall, planBounds, removeOpening, removeWall, updateWall, wallLength } from '@/core/model';
import type { Opening, Plan, Point, Wall } from '@/core/model';
import { closestOnSegment, distance, leftNormal, unit } from '@/core/geometry';
import { snap } from '@/core/snap';
import type { SnapMode } from '@/core/snap';
import { pointOnWall } from '@/core/openings';
import { wallFootprint } from '@/core/walls-geometry';
import { find_rooms } from '@/core/rooms';
import type { Room } from '@/core/rooms';
import { formatArea, formatLength } from '@/core/format';
import { settings } from '@/core/settings';
import { selectPlan, useEditor } from './store';
import type { Tool, View } from './store';

// colours
const COL_WALL = '#2b2f33';
const COL_WALL_SEL = '#c2562b';
const COL_ROOM = 'rgba(194, 86, 43, 0.07)';
const COL_GRID_MINOR = '#e4e1d8';
const COL_GRID_MAJOR = '#cfcabc';
const COL_DOOR = '#fbfaf6';
const COL_WINDOW = '#bcd9ea';
const COL_DRAFT = '#c2562b';

const HIT_PX = 8;
const HANDLE_PX = 6;
const MIN_WALL_MM = 100;

interface Size {
  w: number;
  h: number;
}

interface Draft {
  start: Point;
  cur: Point;
}

interface Hover {
  p: Point;
  raw: Point;
  mode: SnapMode | 'none';
}

interface GridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

interface PanState {
  sx: number;
  sy: number;
  cx: number;
  cy: number;
}

interface DragState {
  wallId: string;
  which: 'start' | 'end';
  base: Plan;
}

// ---------------------------------------------------------------- helpers

function buildGrid(view: View, size: Size, s: number): GridLine[] {
  if (size.w === 0 || size.h === 0) return [];
  const halfW = size.w / 2 / s;
  const halfH = size.h / 2 / s;
  let step = 100;
  for (const st of [100, 500, 1000, 5000, 10000, 50000]) {
    step = st;
    if (st * s >= 12) break;
  }
  const out: GridLine[] = [];
  const x0 = Math.floor((view.cx - halfW) / step) * step;
  const y0 = Math.floor((view.cy - halfH) / step) * step;
  for (let x = x0; x <= view.cx + halfW; x += step) {
    out.push({ x1: x, y1: view.cy - halfH, x2: x, y2: view.cy + halfH, major: x % (step * 5) === 0 });
  }
  for (let y = y0; y <= view.cy + halfH; y += step) {
    out.push({ x1: view.cx - halfW, y1: y, x2: view.cx + halfW, y2: y, major: y % (step * 5) === 0 });
  }
  return out;
}

function pointsAttr(pts: Point[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

function openingPoly(w: Wall, op: Opening): Point[] {
  const d = unit(w.start, w.end);
  const n = leftNormal(d);
  const h = w.thickness / 2 + 4;
  const at = (a: number, side: number): Point => ({
    x: w.start.x + d.x * a + n.x * h * side,
    y: w.start.y + d.y * a + n.y * h * side,
  });
  return [at(op.offset, -1), at(op.offset + op.width, -1), at(op.offset + op.width, 1), at(op.offset, 1)];
}

// quarter circle swept by a door leaf, as a polyline
function doorSwing(w: Wall, op: Opening): Point[] {
  const d = unit(w.start, w.end);
  const n = leftNormal(d);
  const hinge = { x: w.start.x + d.x * op.offset, y: w.start.y + d.y * op.offset };
  const out: Point[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    out.push({
      x: hinge.x + op.width * (Math.cos(a) * d.x + Math.sin(a) * n.x),
      y: hinge.y + op.width * (Math.cos(a) * d.y + Math.sin(a) * n.y),
    });
  }
  return [hinge, ...out];
}

function hitWall(plan: Plan, p: Point, tolMm: number): Wall | null {
  let best: Wall | null = null;
  let bestD = Infinity;
  for (const w of plan.walls) {
    const c = closestOnSegment(p, w.start, w.end);
    if (c.dist <= w.thickness / 2 + tolMm && c.dist < bestD) {
      best = w;
      bestD = c.dist;
    }
  }
  return best;
}

function hitOpening(plan: Plan, p: Point, tolMm: number): Opening | null {
  for (const op of plan.openings) {
    const w = plan.walls.find((x) => x.id === op.wallId);
    if (!w) continue;
    const a = pointOnWall(w, op.offset);
    const b = pointOnWall(w, op.offset + op.width);
    if (closestOnSegment(p, a, b).dist <= w.thickness / 2 + tolMm) return op;
  }
  return null;
}

function placement(w: Wall, p: Point, width: number): number | null {
  const len = wallLength(w);
  if (len < width) return null;
  const hit = closestOnSegment(p, w.start, w.end);
  const along = hit.t * len;
  const raw = Math.round((along - width / 2) / 10) * 10;
  return Math.min(len - width, Math.max(0, raw));
}

// lock a segment to the horizontal or vertical axis, whichever is closer
function ortho(a: Point, b: Point): Point {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return dx >= dy ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
}

// picks a round length for the scale bar so it is 80 to 160 px wide
function niceBar(scale: number): { mm: number; px: number } {
  const options = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  for (const mm of options) {
    if (mm * scale >= 80) return { mm, px: mm * scale };
  }
  const last = options[options.length - 1];
  return { mm: last, px: last * scale };
}

function Rulers({ view, size, scale }: { view: View; size: Size; scale: number }) {
  if (size.w === 0) return null;
  let step = 100;
  for (const st of [100, 500, 1000, 5000, 10000, 50000]) {
    step = st;
    if (st * scale >= 50) break;
  }
  const ticksX: number[] = [];
  const ticksY: number[] = [];
  const x0 = Math.ceil((view.cx - size.w / 2 / scale) / step) * step;
  const y0 = Math.ceil((view.cy - size.h / 2 / scale) / step) * step;
  for (let x = x0; x <= view.cx + size.w / 2 / scale; x += step) ticksX.push(x);
  for (let y = y0; y <= view.cy + size.h / 2 / scale; y += step) ticksY.push(y);
  const label = (mm: number) => (step >= 1000 ? String(mm / 1000) : String(mm));
  return (
    <g pointerEvents="none" fontSize={10} fill="#8a8272">
      <rect x={0} y={0} width={size.w} height={16} fill="#faf9f5" fillOpacity={0.85} />
      <rect x={0} y={0} width={16} height={size.h} fill="#faf9f5" fillOpacity={0.85} />
      {ticksX.map((x) => {
        const sx = size.w / 2 + (x - view.cx) * scale;
        return (
          <g key={'x' + x}>
            <line x1={sx} y1={10} x2={sx} y2={16} stroke="#b0a99a" />
            <text x={sx + 2} y={9}>
              {label(x)}
            </text>
          </g>
        );
      })}
      {ticksY.map((y) => {
        const sy = size.h / 2 - (y - view.cy) * scale;
        return (
          <g key={'y' + y}>
            <line x1={10} y1={sy} x2={16} y2={sy} stroke="#b0a99a" />
            <text x={2} y={sy - 2} transform={`rotate(-90 2 ${sy - 2})`}>
              {label(y)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function centroid(r: Room): Point {
  let x = 0;
  let y = 0;
  for (const p of r.poly) {
    x += p.x;
    y += p.y;
  }
  return { x: x / r.poly.length, y: y / r.poly.length };
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

const HINTS: Record<Tool, string> = {
  select: 'Click a wall or opening. Drag the round handles to move wall ends. Arrow keys nudge. Delete removes it.',
  wall: 'Click to start a wall, click again to continue. Shift keeps it straight. Double click or Esc to stop. L shows lengths.',
  door: 'Click on a wall to place a door.',
  window: 'Click on a wall to place a window.',
  pan: 'Drag to move the view. The wheel zooms.',
};

// ------------------------------------------------------------- component

export default function Editor2D() {
  const plan = useEditor(selectPlan);
  const tool = useEditor((s) => s.tool);
  const selection = useEditor((s) => s.selection);
  const view = useEditor((s) => s.view);
  const loadId = useEditor((s) => s.loadId);
  const { commit, preview, commitFrom, select, setView, setTool, undo, redo } = useEditor.getState();

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [showDims, setShowDims] = useState(false);

  const chainStart = useRef<Point | null>(null);
  const pan = useRef<PanState | null>(null);
  const drag = useRef<DragState | null>(null);
  const spaceDown = useRef(false);
  const viewRef = useRef(view);
  const fittedFor = useRef(-1);
  viewRef.current = view;

  const scale = settings.view.pxPerMmAtZoom1 * view.zoom;

  // plan -> screen and back. y is flipped: plan y points up, screen y down.
  const scr = (p: Point): Point => ({
    x: size.w / 2 + (p.x - view.cx) * scale,
    y: size.h / 2 - (p.y - view.cy) * scale,
  });

  function wld(e: { clientX: number; clientY: number }): Point {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: view.cx + (e.clientX - r.left - size.w / 2) / scale,
      y: view.cy - (e.clientY - r.top - size.h / 2) / scale,
    };
  }

  // size of the drawing area
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // fit the view when a whole plan is loaded
  useEffect(() => {
    if (size.w === 0 || fittedFor.current === loadId) return;
    fittedFor.current = loadId;
    const b = planBounds(useEditor.getState().history.present);
    if (!b) return;
    const bw = Math.max(1000, b.max.x - b.min.x);
    const bh = Math.max(1000, b.max.y - b.min.y);
    const zoom = Math.min(
      (size.w * 0.8) / (bw * settings.view.pxPerMmAtZoom1),
      (size.h * 0.8) / (bh * settings.view.pxPerMmAtZoom1),
    );
    setView({ zoom, cx: (b.min.x + b.max.x) / 2, cy: (b.min.y + b.max.y) / 2 });
  }, [loadId, size.w, size.h, setView]);

  // wheel needs a non passive listener to stop the page from scrolling
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const v = viewRef.current;
      const zoom = Math.min(settings.view.maxZoom, Math.max(settings.view.minZoom, v.zoom * Math.exp(-ev.deltaY * 0.0015)));
      const r = el.getBoundingClientRect();
      const mx = ev.clientX - r.left - r.width / 2;
      const my = ev.clientY - r.top - r.height / 2;
      const s0 = settings.view.pxPerMmAtZoom1 * v.zoom;
      const s1 = settings.view.pxPerMmAtZoom1 * zoom;
      const wx = v.cx + mx / s0;
      const wy = v.cy - my / s0;
      setView({ zoom, cx: wx - mx / s1, cy: wy + my / s1 });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setView]);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const st = useEditor.getState();
      if (e.code === 'Space') {
        spaceDown.current = true;
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape') {
        setDraft(null);
        chainStart.current = null;
        select(null);
        return;
      }
      if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
        setShowDims((v) => !v);
        return;
      }
      // arrow keys move the selected wall by one grid step (ten with shift)
      if (e.key.startsWith('Arrow') && st.selection?.kind === 'wall') {
        const step = settings.snap.gridMm * (e.shiftKey ? 10 : 1);
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowDown' ? -step : e.key === 'ArrowUp' ? step : 0;
        const cur = st.history.present;
        const w = cur.walls.find((x) => x.id === st.selection!.id);
        if (!w) return;
        e.preventDefault();
        commit(
          updateWall(cur, w.id, {
            start: { x: w.start.x + dx, y: w.start.y + dy },
            end: { x: w.end.x + dx, y: w.end.y + dy },
          }),
        );
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = st.selection;
        const cur = st.history.present;
        if (!sel) return;
        if (sel.kind === 'wall') commit(removeWall(cur, sel.id));
        else commit(removeOpening(cur, sel.id));
        select(null);
        return;
      }
      const map: Record<string, Tool> = { v: 'select', w: 'wall', d: 'door', n: 'window', h: 'pan' };
      const t = map[e.key.toLowerCase()];
      if (t && !e.ctrlKey && !e.metaKey) {
        setTool(t);
        setDraft(null);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [commit, redo, undo, select, setTool]);

  // ------------------------------------------------------------ memos

  const grid = useMemo(() => buildGrid(view, size, scale), [view]);
  const rooms = useMemo(() => find_rooms(plan), [plan.walls]);

  // ------------------------------------------------------------ pointer

  function onPtrDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button === 2) return;
    const raw = wld(e);

    if (e.button === 1 || tool === 'pan' || spaceDown.current) {
      pan.current = { sx: e.clientX, sy: e.clientY, cx: view.cx, cy: view.cy };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    const sn = snap(raw, plan, { zoom: view.zoom });
    const tol = HIT_PX / scale;

    if (tool === 'wall') {
      const pt = e.shiftKey && draft ? ortho(draft.start, sn.point) : sn.point;
      if (!draft) {
        chainStart.current = pt;
        setDraft({ start: pt, cur: pt });
      } else if (distance(draft.start, pt) >= MIN_WALL_MM) {
        commit(addWall(plan, draft.start, pt));
        // clicking back on the first point of the chain closes it
        if (chainStart.current && distance(chainStart.current, pt) === 0) {
          chainStart.current = null;
          setDraft(null);
        } else {
          setDraft({ start: pt, cur: pt });
        }
      }
      return;
    }

    if (tool === 'select') {
      // handles of the selected wall first
      if (selection?.kind === 'wall') {
        const w = plan.walls.find((x) => x.id === selection.id);
        if (w) {
          for (const which of ['start', 'end'] as const) {
            const sp = scr(w[which]);
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
            const py = e.clientY - e.currentTarget.getBoundingClientRect().top;
            if (Math.hypot(sp.x - px, sp.y - py) <= HANDLE_PX + 4) {
              drag.current = { wallId: w.id, which, base: plan };
              e.currentTarget.setPointerCapture(e.pointerId);
              return;
            }
          }
        }
      }
      const op = hitOpening(plan, raw, tol);
      if (op) {
        select({ kind: 'opening', id: op.id });
        return;
      }
      const w = hitWall(plan, raw, tol);
      select(w ? { kind: 'wall', id: w.id } : null);
      return;
    }

    // door or window
    const w = hitWall(plan, raw, tol);
    if (!w) return;
    const def = tool === 'door' ? settings.opening.door : settings.opening.window;
    const off = placement(w, raw, def.width);
    if (off === null) return;
    const next = addOpening(plan, w.id, tool, off);
    commit(next);
    select({ kind: 'opening', id: next.openings[next.openings.length - 1].id });
  }

  function onPtrMove(e: React.PointerEvent<SVGSVGElement>) {
    const raw = wld(e);
    console.log('move', Math.round(raw.x), Math.round(raw.y));

    if (pan.current) {
      const p = pan.current;
      setView({ zoom: view.zoom, cx: p.cx - (e.clientX - p.sx) / scale, cy: p.cy + (e.clientY - p.sy) / scale });
      return;
    }

    let basePlan = plan;
    if (drag.current) basePlan = removeWall(drag.current.base, drag.current.wallId);
    const sn = snap(raw, basePlan, { zoom: view.zoom });
    setHover({ p: sn.point, raw, mode: sn.mode });

    if (drag.current) {
      // FIXME: only this wall moves, the walls that share the end stay behind and leave a gap
      const d = drag.current;
      const w = d.base.walls.find((x) => x.id === d.wallId);
      if (w && distance(d.which === 'start' ? w.end : w.start, sn.point) >= MIN_WALL_MM) {
        preview(updateWall(d.base, d.wallId, { [d.which]: sn.point }));
      }
      return;
    }
    if (draft) setDraft({ ...draft, cur: e.shiftKey ? ortho(draft.start, sn.point) : sn.point });
  }

  function onPtrUp(e: React.PointerEvent<SVGSVGElement>) {
    if (pan.current) {
      pan.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (drag.current) {
      const d = drag.current;
      drag.current = null;
      commitFrom(d.base, useEditor.getState().history.present);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function onDbl() {
    setDraft(null);
    chainStart.current = null;
  }

  // wall under the cursor in the select tool, drawn lighter
  const hoverWallId = useMemo(() => {
    if (!hover || tool !== 'select') return null;
    return hitWall(plan, hover.raw, HIT_PX / scale)?.id ?? null;
  }, [hover, tool, plan, scale]);

  const bar = niceBar(scale);

  // ------------------------------------------------------------ render bits

  const selWall = selection?.kind === 'wall' ? plan.walls.find((w) => w.id === selection.id) : undefined;
  const selOpId = selection?.kind === 'opening' ? selection.id : null;

  const ghost = useMemo(() => {
    if (!hover || (tool !== 'door' && tool !== 'window')) return null;
    const w = hitWall(plan, hover.raw, HIT_PX / scale);
    if (!w) return null;
    const def = tool === 'door' ? settings.opening.door : settings.opening.window;
    const off = placement(w, hover.raw, def.width);
    if (off === null) return null;
    const fake: Opening = { id: 'ghost', wallId: w.id, kind: tool, offset: off, width: def.width, height: def.height, sill: def.sill };
    return openingPoly(w, fake);
  }, [hover, tool, plan, scale]);

  const cursor = tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
  const units = plan.meta.units;

  const draftLen = draft ? distance(draft.start, draft.cur) : 0;
  const draftMid = draft ? scr({ x: (draft.start.x + draft.cur.x) / 2, y: (draft.start.y + draft.cur.y) / 2 }) : null;

  return (
    <div ref={wrapRef} className="absolute inset-0 select-none overflow-hidden bg-[#faf9f5]">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        style={{ cursor, touchAction: 'none', display: 'block' }}
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerLeave={() => setHover(null)}
        onDoubleClick={onDbl}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={`translate(${size.w / 2} ${size.h / 2}) scale(${scale} ${-scale}) translate(${-view.cx} ${-view.cy})`}>
          {/* grid */}
          {grid.map((g, i) => (
            <line
              key={i}
              x1={g.x1}
              y1={g.y1}
              x2={g.x2}
              y2={g.y2}
              stroke={g.major ? COL_GRID_MAJOR : COL_GRID_MINOR}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* origin */}
          <line x1={-300} y1={0} x2={300} y2={0} stroke="#b0a99a" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={-300} x2={0} y2={300} stroke="#b0a99a" strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {/* rooms */}
          {rooms.map((r) => (
            <polygon key={r.id} points={pointsAttr(r.poly)} fill={COL_ROOM} stroke="none" />
          ))}

          {/* walls */}
          {plan.walls.map((w) => {
            const sel = selection?.kind === 'wall' && selection.id === w.id;
            return (
              <polygon
                key={w.id}
                points={pointsAttr(wallFootprint(w))}
                fill={sel ? '#e7b9a4' : w.id === hoverWallId ? '#59606a' : '#3a3f44'}
                stroke={sel ? COL_WALL_SEL : COL_WALL}
                strokeWidth={sel ? 2 : 1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* openings */}
          {plan.openings.map((op) => {
            const w = plan.walls.find((x) => x.id === op.wallId);
            if (!w) return null;
            const sel = op.id === selOpId;
            return (
              <g key={op.id}>
                <polygon
                  points={pointsAttr(openingPoly(w, op))}
                  fill={op.kind === 'door' ? COL_DOOR : COL_WINDOW}
                  stroke={sel ? COL_WALL_SEL : '#6b7076'}
                  strokeWidth={sel ? 2 : 1}
                  vectorEffect="non-scaling-stroke"
                />
                {op.kind === 'door' && (
                  <polyline
                    points={pointsAttr(doorSwing(w, op))}
                    fill="none"
                    stroke={sel ? COL_WALL_SEL : '#8c9298'}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>
            );
          })}

          {/* ghost of the opening about to be placed */}
          {ghost && (
            <polygon
              points={pointsAttr(ghost)}
              fill={COL_DRAFT}
              fillOpacity={0.25}
              stroke={COL_DRAFT}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* wall being drawn */}
          {draft && (
            <line
              x1={draft.start.x}
              y1={draft.start.y}
              x2={draft.cur.x}
              y2={draft.cur.y}
              stroke={COL_DRAFT}
              strokeWidth={2}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>

        {/* things drawn in screen space so text and handles keep their size */}
        {rooms.map((r) => {
          const c = scr(centroid(r));
          return (
            <g key={r.id} pointerEvents="none">
              <text x={c.x} y={c.y - 4} textAnchor="middle" fontSize={12} fill="#5b5448">
                {r.id}
              </text>
              <text x={c.x} y={c.y + 12} textAnchor="middle" fontSize={13} fontWeight={600} fill="#2b2f33">
                {formatArea(r.area)} m²
              </text>
            </g>
          );
        })}

        {/* every wall length, toggled with L */}
        {showDims &&
          plan.walls.map((w) => {
            const a = scr(w.start);
            const b = scr(w.end);
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            if (len < 40) return null;
            let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            if (ang > 90 || ang < -90) ang += 180;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <text
                key={'dim' + w.id}
                x={mx}
                y={my - w.thickness * scale * 0.5 - 4}
                textAnchor="middle"
                fontSize={11}
                fill="#5b5448"
                transform={`rotate(${ang} ${mx} ${my})`}
                pointerEvents="none"
              >
                {formatLength(wallLength(w), units)}
              </text>
            );
          })}

        {selWall && (
          <g pointerEvents="none">
            {(() => {
              const a = scr(selWall.start);
              const b = scr(selWall.end);
              return (
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 10} textAnchor="middle" fontSize={12} fill={COL_WALL_SEL}>
                  {formatLength(wallLength(selWall), units)}
                </text>
              );
            })()}
          </g>
        )}

        {tool === 'select' &&
          selWall &&
          (['start', 'end'] as const).map((which) => {
            const p = scr(selWall[which]);
            return (
              <circle
                key={which}
                cx={p.x}
                cy={p.y}
                r={HANDLE_PX}
                fill="#fff"
                stroke={COL_WALL_SEL}
                strokeWidth={2}
                style={{ cursor: 'move' }}
              />
            );
          })}

        {draft && draftMid && draftLen > 0 && (
          <text x={draftMid.x} y={draftMid.y - 10} textAnchor="middle" fontSize={12} fill={COL_DRAFT} pointerEvents="none">
            {formatLength(draftLen, units)}
          </text>
        )}

        <Rulers view={view} size={size} scale={scale} />

        {/* scale bar */}
        <g pointerEvents="none" transform={`translate(${size.w - bar.px - 16} ${size.h - 28})`}>
          <line x1={0} y1={0} x2={bar.px} y2={0} stroke="#5b5448" strokeWidth={2} />
          <line x1={0} y1={-4} x2={0} y2={4} stroke="#5b5448" strokeWidth={2} />
          <line x1={bar.px} y1={-4} x2={bar.px} y2={4} stroke="#5b5448" strokeWidth={2} />
          <text x={bar.px / 2} y={-8} textAnchor="middle" fontSize={11} fill="#5b5448">
            {bar.mm >= 1000 ? `${bar.mm / 1000} m` : `${bar.mm} mm`}
          </text>
        </g>

        {/* snap marker; the ring is the endpoint radius from settings */}
        {hover && (tool === 'wall' || drag.current) && (
          <g pointerEvents="none">
            {hover.mode === 'endpoint' && (
              <circle
                cx={scr(hover.p).x}
                cy={scr(hover.p).y}
                r={settings.snap.endpointRadiusMm * scale}
                fill="none"
                stroke={COL_DRAFT}
                strokeOpacity={0.4}
                strokeDasharray="3 3"
              />
            )}
            <circle
              cx={scr(hover.p).x}
              cy={scr(hover.p).y}
              r={hover.mode === 'endpoint' ? 5 : 3}
              fill={hover.mode === 'endpoint' ? COL_DRAFT : 'none'}
              stroke={COL_DRAFT}
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute left-2 top-2 max-w-sm rounded bg-white/85 px-2 py-1 text-xs text-neutral-600">
        {HINTS[tool]}
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/85 px-2 py-1 font-mono text-xs text-neutral-600">
        {hover ? `x ${Math.round(hover.p.x)}  y ${Math.round(hover.p.y)}  mm` : 'x -  y -'}
        {'   '}zoom {Math.round(view.zoom * 100)}%{hover && hover.mode !== 'none' ? `   snap: ${hover.mode}` : ''}
      </div>
    </div>
  );
}
