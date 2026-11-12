import { describe, expect, it } from 'vitest';
import { addOpening, emptyPlan } from '../src/core/model';
import { planReport } from '../src/core/report';
import { loadFixture, rectPlan } from './helpers';

describe('planReport', () => {
  it('reports apartment-2br with both areas for every room', () => {
    const md = planReport(loadFixture('apartment-2br'));
    expect(md.startsWith('# apartment-2br\n')).toBe(true);
    expect(md).toContain('| room | inner m² | centre m² | perimeter m | openings |');
    expect(md).toContain('| room-01 | 19.11 | 20.00 |');
    expect(md).toContain('## Problems\n\nNone.');
  });

  it('is the same text for the same plan', () => {
    const p = loadFixture('l-room');
    expect(planReport(p)).toBe(planReport(JSON.parse(JSON.stringify(p))));
  });

  it('says what is missing in an empty plan', () => {
    const md = planReport(emptyPlan('blank'));
    expect(md).toContain('No closed rooms found.');
    expect(md).toContain('No walls.');
  });

  it('lists problems and hints', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 3500, { width: 900 });
    const md = planReport(addOpening(p, 'w-002', 'door', 1000, { width: 600 }));
    expect(md).toMatch(/## Problems\n\n- .*past the end/);
    expect(md).toMatch(/## Hints\n\n- /);
    expect(md).toContain("Door o-002 is 600 mm wide");
  });
});
