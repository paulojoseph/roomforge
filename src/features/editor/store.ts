import { create } from 'zustand';
import { emptyPlan } from '@/core/model';
import type { Plan } from '@/core/model';
import { canRedo, canUndo, clearHistory, createHistory, pushState, redo, replacePresent, undo } from '@/core/history';
import type { History } from '@/core/history';
import { settings } from '@/core/settings';

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'pan';

export type Selection = { kind: 'wall' | 'opening'; id: string } | null;

export interface View {
  zoom: number;
  /** plan coordinates (mm) at the centre of the 2D view */
  cx: number;
  cy: number;
}

export type RendererKind = 'WebGPU' | 'WebGL';

interface EditorState {
  history: History<Plan>;
  tool: Tool;
  selection: Selection;
  view: View;
  fileName: string | null;
  /** bumped every time a whole plan is loaded, the 3D camera refits on it */
  loadId: number;
  renderer: RendererKind | null;

  setTool: (t: Tool) => void;
  select: (s: Selection) => void;
  setView: (v: View) => void;
  setRenderer: (r: RendererKind) => void;

  /** one undo step */
  commit: (next: Plan) => void;
  /** live change while dragging, no undo step */
  preview: (next: Plan) => void;
  /** closes a drag: `base` is what the plan was before it started */
  commitFrom: (base: Plan, next: Plan) => void;
  undo: () => void;
  redo: () => void;
  loadPlan: (plan: Plan, fileName: string | null) => void;
}

export const useEditor = create<EditorState>((set) => ({
  history: createHistory(emptyPlan()),
  tool: 'wall',
  selection: null,
  view: { zoom: 1, cx: 3000, cy: 2500 },
  fileName: null,
  loadId: 0,
  renderer: null,

  setTool: (tool) => set({ tool }),
  select: (selection) => set({ selection }),
  setView: (view) =>
    set({ view: { ...view, zoom: Math.min(settings.view.maxZoom, Math.max(settings.view.minZoom, view.zoom)) } }),
  setRenderer: (renderer) => set({ renderer }),

  commit: (next) => set((s) => ({ history: pushState(s.history, next) })),
  preview: (next) => set((s) => ({ history: replacePresent(s.history, next) })),
  commitFrom: (base, next) =>
    set((s) => ({ history: pushState(replacePresent(s.history, base), next) })),
  undo: () => set((s) => ({ history: undo(s.history), selection: null })),
  redo: () => set((s) => ({ history: redo(s.history), selection: null })),
  loadPlan: (plan, fileName) =>
    set((s) => ({
      history: clearHistory(createHistory(plan)),
      selection: null,
      fileName,
      loadId: s.loadId + 1,
    })),
}));

export const selectPlan = (s: EditorState) => s.history.present;
export const selectCanUndo = (s: EditorState) => canUndo(s.history);
export const selectCanRedo = (s: EditorState) => canRedo(s.history);
