import { settings } from './settings';

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistory<T>(initial: T): History<T> {
  return { past: [], present: initial, future: [] };
}

/** Records `next` as the new present. Same reference as present is a no-op. */
export function pushState<T>(h: History<T>, next: T, limit: number = settings.history.limit): History<T> {
  if (next === h.present) return h;
  const past = [...h.past, h.present];
  while (past.length > limit) past.shift();
  return { past, present: next, future: [] };
}

/** Changes the present without adding an undo step (used while dragging). */
export function replacePresent<T>(h: History<T>, next: T): History<T> {
  return { ...h, present: next };
}

export function canUndo<T>(h: History<T>): boolean {
  return h.past.length > 0;
}

export function canRedo<T>(h: History<T>): boolean {
  return h.future.length > 0;
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  const prev = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: prev,
    future: [h.present, ...h.future],
  };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  const [next, ...rest] = h.future;
  return {
    past: [...h.past, h.present],
    present: next,
    future: rest,
  };
}

export function clearHistory<T>(h: History<T>): History<T> {
  return { past: [], present: h.present, future: [] };
}
