import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  clearHistory,
  createHistory,
  pushState,
  redo,
  replacePresent,
  undo,
} from '../src/core/history';

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistory(1);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe(1);
  });

  it('push moves the present into the past', () => {
    const h = pushState(createHistory(1), 2);
    expect(h.past).toEqual([1]);
    expect(h.present).toBe(2);
  });

  it('pushing the same value is a no-op', () => {
    const a = { n: 1 };
    const h = createHistory(a);
    expect(pushState(h, a)).toBe(h);
  });

  it('undo and redo walk back and forth', () => {
    let h = createHistory(1);
    h = pushState(h, 2);
    h = pushState(h, 3);
    h = undo(h);
    expect(h.present).toBe(2);
    h = undo(h);
    expect(h.present).toBe(1);
    h = redo(h);
    expect(h.present).toBe(2);
    expect(canRedo(h)).toBe(true);
  });

  it('undo at the start and redo at the end change nothing', () => {
    const h = createHistory(1);
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it('a new push drops the redo branch', () => {
    let h = pushState(pushState(createHistory(1), 2), 3);
    h = undo(h);
    h = pushState(h, 9);
    expect(h.future).toEqual([]);
    expect(h.present).toBe(9);
  });

  it('keeps at most `limit` steps', () => {
    let h = createHistory(0);
    for (let i = 1; i <= 10; i++) h = pushState(h, i, 3);
    expect(h.past).toEqual([7, 8, 9]);
  });

  it('replacePresent does not add a step; clearHistory forgets them', () => {
    let h = pushState(createHistory(1), 2);
    h = replacePresent(h, 5);
    expect(h.past).toEqual([1]);
    expect(h.present).toBe(5);
    h = clearHistory(h);
    expect(h.past).toEqual([]);
    expect(h.present).toBe(5);
  });
});
