'use client';

import { useRef, useState } from 'react';
import { emptyPlan, renamePlan } from '@/core/model';
import { EXAMPLES } from './examples';
import { describeError, readPlanFile, savePlanFile, saveRoomsCsv, saveSvgFile } from './file-io';
import { selectCanRedo, selectCanUndo, selectPlan, useEditor } from './store';
import type { Tool } from './store';

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Select', key: 'V' },
  { id: 'wall', label: 'Wall', key: 'W' },
  { id: 'door', label: 'Door', key: 'D' },
  { id: 'window', label: 'Window', key: 'N' },
  { id: 'pan', label: 'Pan', key: 'H' },
];

const btn =
  'rounded border border-neutral-300 bg-white px-2.5 py-1 text-sm hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white';

export default function Toolbar() {
  const plan = useEditor(selectPlan);
  const tool = useEditor((s) => s.tool);
  const canUndo = useEditor(selectCanUndo);
  const canRedo = useEditor(selectCanRedo);
  const { setTool, undo, redo, loadPlan, commit } = useEditor.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onOpen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const p = await readPlanFile(file);
      loadPlan(p, file.name);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-neutral-300 bg-white px-3 py-2">
      <span className="mr-2 text-base font-semibold tracking-tight">roomforge</span>

      <div className="flex gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={btn + (tool === t.id ? ' !border-accent !bg-accent !text-white' : '')}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.key})`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ml-2 flex gap-1">
        <button className={btn} disabled={!canUndo} onClick={() => undo()} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button className={btn} disabled={!canRedo} onClick={() => redo()} title="Redo (Ctrl+Shift+Z)">
          Redo
        </button>
      </div>

      <div className="ml-2 flex items-center gap-1">
        <button className={btn} onClick={() => loadPlan(emptyPlan(), null)}>
          New
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()}>
          Open
        </button>
        <button className={btn} onClick={() => savePlanFile(plan)}>
          Save
        </button>
        <button className={btn} onClick={() => saveSvgFile(plan)} title="Drawing with room areas and dimensions">
          SVG
        </button>
        <button className={btn} onClick={() => saveRoomsCsv(plan)} title="Room schedule for a spreadsheet">
          CSV
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onOpen} />
        <select
          className={btn}
          value=""
          onChange={(e) => {
            const ex = EXAMPLES[Number(e.target.value)];
            if (ex) loadPlan(ex.load(), null);
          }}
        >
          <option value="">Examples</option>
          {EXAMPLES.map((ex, i) => (
            <option key={ex.label} value={i}>
              {ex.label}
            </option>
          ))}
        </select>
      </div>

      <label className="ml-auto flex items-center gap-2 text-sm">
        Plan
        <input
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
          value={plan.meta.name}
          onChange={(e) => commit(renamePlan(plan, e.target.value || 'untitled'))}
        />
      </label>
      {error && <span className="w-full text-sm text-red-700">Could not open the file: {error}</span>}
    </header>
  );
}
