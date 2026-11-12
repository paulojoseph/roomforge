'use client';

import { useMemo } from 'react';
import { find_rooms } from '@/core/rooms';
import { formatArea, formatMeters } from '@/core/format';
import { removeOpening, removeWall, updateWall } from '@/core/model';
import type { Opening, Plan, Wall } from '@/core/model';
import { validatePlan } from '@/core/validate';
import { advisePlan } from '@/core/advise';
import { planStats } from '@/core/stats';
import { selectPlan, useEditor } from './store';

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      {label}
      <input
        type="number"
        className="rounded border border-neutral-300 bg-white px-1.5 py-0.5"
        value={value}
        onChange={(e) => {
          const n = Math.round(Number(e.target.value));
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </label>
  );
}

function WallProps({ wall, plan }: { wall: Wall; plan: Plan }) {
  const { commit, select } = useEditor.getState();
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">Wall {wall.id}</div>
      <NumberField label="Thickness (mm)" value={wall.thickness} onChange={(n) => commit(updateWall(plan, wall.id, { thickness: n }))} />
      <NumberField label="Height (mm)" value={wall.height} onChange={(n) => commit(updateWall(plan, wall.id, { height: n }))} />
      <button
        className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm hover:bg-neutral-100"
        onClick={() => {
          commit(removeWall(plan, wall.id));
          select(null);
        }}
      >
        Delete wall
      </button>
    </div>
  );
}

function OpeningProps({ op, plan }: { op: Opening; plan: Plan }) {
  const { commit, select } = useEditor.getState();
  const set = (patch: Partial<Opening>) =>
    commit({ ...plan, openings: plan.openings.map((o) => (o.id === op.id ? { ...o, ...patch } : o)) });
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">
        {op.kind === 'door' ? 'Door' : 'Window'} {op.id} on {op.wallId}
      </div>
      <NumberField label="Offset (mm)" value={op.offset} onChange={(n) => set({ offset: n })} />
      <NumberField label="Width (mm)" value={op.width} onChange={(n) => set({ width: n })} />
      <NumberField label="Height (mm)" value={op.height} onChange={(n) => set({ height: n })} />
      <NumberField label="Sill (mm)" value={op.sill} onChange={(n) => set({ sill: n })} />
      <button
        className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm hover:bg-neutral-100"
        onClick={() => {
          commit(removeOpening(plan, op.id));
          select(null);
        }}
      >
        Delete opening
      </button>
    </div>
  );
}

export default function Sidebar() {
  const plan = useEditor(selectPlan);
  const selection = useEditor((s) => s.selection);
  const fileName = useEditor((s) => s.fileName);

  const rooms = useMemo(() => find_rooms(plan), [plan]);
  const problems = useMemo(() => validatePlan(plan), [plan]);
  const hints = useMemo(() => advisePlan(plan), [plan]);
  const stats = useMemo(() => planStats(plan), [plan]);
  const total = rooms.reduce((s, r) => s + r.area, 0);

  const selWall = selection?.kind === 'wall' ? plan.walls.find((w) => w.id === selection.id) : undefined;
  const selOp = selection?.kind === 'opening' ? plan.openings.find((o) => o.id === selection.id) : undefined;

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-neutral-300 bg-white p-3">
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Plan</h2>
        <div className="text-sm">{plan.meta.name}</div>
        <div className="text-xs text-neutral-500">
          {plan.walls.length} walls, {plan.openings.length} openings
          {fileName ? ` - ${fileName}` : ''}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Rooms</h2>
        {rooms.length === 0 ? (
          <p className="text-sm text-neutral-500">No closed rooms yet. Draw walls so they meet end to end.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td className="py-0.5">{r.id}</td>
                  <td className="py-0.5 text-right tabular-nums">{formatArea(r.area)} m²</td>
                </tr>
              ))}
              <tr className="border-t border-neutral-300 font-medium">
                <td className="py-0.5">Total</td>
                <td className="py-0.5 text-right tabular-nums">{formatArea(total)} m²</td>
              </tr>
            </tbody>
          </table>
        )}
        <p className="mt-1 text-xs text-neutral-500">Measured to the wall centre line.</p>
      </section>

      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Quantities</h2>
        <dl className="grid grid-cols-2 gap-y-0.5 text-sm">
          <dt className="text-neutral-500">Wall length</dt>
          <dd className="text-right tabular-nums">{formatMeters(stats.wallLength)} m</dd>
          <dt className="text-neutral-500">Wall surface</dt>
          <dd className="text-right tabular-nums">{formatArea(stats.wallSurface)} m²</dd>
          <dt className="text-neutral-500">Doors / windows</dt>
          <dd className="text-right tabular-nums">
            {stats.doors} / {stats.windows}
          </dd>
        </dl>
      </section>

      {(selWall || selOp) && (
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Selection</h2>
          {selWall && <WallProps wall={selWall} plan={plan} />}
          {selOp && <OpeningProps op={selOp} plan={plan} />}
        </section>
      )}

      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Checks</h2>
        {problems.length === 0 ? (
          <p className="text-sm text-neutral-500">No problems found.</p>
        ) : (
          <ul className="space-y-1 text-sm text-red-800">
            {problems.slice(0, 12).map((p, i) => (
              <li key={i}>{p.message}</li>
            ))}
            {problems.length > 12 && <li>and {problems.length - 12} more</li>}
          </ul>
        )}
      </section>
      {hints.length > 0 && (
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Hints</h2>
          <ul className="space-y-1 text-sm text-amber-800">
            {hints.slice(0, 8).map((h, i) => (
              <li key={i}>{h.message}</li>
            ))}
            {hints.length > 8 && <li>and {hints.length - 8} more</li>}
          </ul>
        </section>
      )}
    </aside>
  );
}
