import { describe, expect, it } from 'vitest';
import { addOpening, emptyPlan, renamePlan } from '../src/core/model';
import { exportSvg } from '../src/core/export-svg';
import { loadFixture, rectPlan } from './helpers';

describe('exportSvg', () => {
  it('says so for an empty plan', () => {
    const svg = exportSvg(emptyPlan('nothing'));
    expect(svg).toContain('empty plan');
    expect(svg.startsWith('<svg')).toBe(true);
  });

  it('sizes the drawing from the extent, the margin and the scale', () => {
    const svg = exportSvg(rectPlan());
    // (4150 + 2 * 600) mm by (3150 + 2 * 600) mm at 0.1 px per mm
    expect(svg).toContain('width="535" height="435" viewBox="0 0 535 435"');
    expect(exportSvg(rectPlan(), { pxPerMm: 0.05, margin: 0 })).toContain('width="207.5" height="157.5"');
  });

  it('draws a polygon per wall with y pointing down', () => {
    const svg = exportSvg(rectPlan());
    expect(svg).toContain('<polygon data-id="w-001" points="67.5,375 467.5,375 467.5,360 67.5,360"/>');
    expect((svg.match(/data-id="w-00\d"/g) ?? []).length).toBe(4);
  });

  it('is the same text every time', () => {
    const p = addOpening(addOpening(rectPlan(), 'w-001', 'door', 100), 'w-003', 'window', 500);
    const opts = { rooms: true, dimensions: true };
    expect(exportSvg(p, opts)).toBe(exportSvg(JSON.parse(JSON.stringify(p)), opts));
  });

  it('escapes the plan name', () => {
    expect(exportSvg(renamePlan(rectPlan(), 'A & B <1> "x"'))).toContain('<title>A &amp; B &lt;1&gt; &quot;x&quot;</title>');
  });

  it('draws a door with its leaf and swing, a window with a line', () => {
    const door = exportSvg(addOpening(rectPlan(), 'w-001', 'door', 100));
    expect(door).toContain('data-id="o-001"');
    expect(door).toMatch(/<path fill="none" d="M [\d.]+ [\d.]+ A 90 90 0 0 1 [\d.]+ [\d.]+"\/>/);
    const win = exportSvg(addOpening(rectPlan(), 'w-001', 'window', 100));
    expect(win).not.toContain('<path');
    expect(win).toContain('data-id="o-001"');
  });

  it('labels rooms with the inner area when asked', () => {
    const plain = exportSvg(rectPlan());
    expect(plain).not.toContain('id="rooms"');
    expect(exportSvg(rectPlan(), { rooms: true })).toContain('>room-01 10.97 m²</text>');
  });

  it('adds dimensions when asked, with the wall length as text', () => {
    const svg = exportSvg(rectPlan(), { dimensions: true });
    expect(svg).toContain('id="dimensions"');
    expect(svg).toContain('>4000</text>');
    expect(svg).toContain('>3000</text>');
  });

  it('handles a real fixture', () => {
    const svg = exportSvg(loadFixture('apartment-2br'), { rooms: true, dimensions: true });
    expect((svg.match(/<polygon data-id="w-/g) ?? []).length).toBe(20);
    expect(svg.endsWith('</svg>\n')).toBe(true);
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('undefined');
  });
});
