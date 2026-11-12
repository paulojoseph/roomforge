import { describe, expect, it } from 'vitest';
import * as core from '../src/core/index';

describe('core index', () => {
  it('exports the public functions', () => {
    const names = [
      'parseLength', 'planExtent', 'zoomToFit', 'planStats', 'rotatePlan', 'splitWall', 'mergeWalls', 'copyWalls',
      'pasteFragment', 'findCrossings', 'diffPlans', 'upgradePlan', 'wallDimensions', 'exportSvg', 'wallsCsv',
      'addRectRoom', 'advisePlan', 'renumberIds', 'planReport',
    ];
    for (const n of names) expect(typeof (core as Record<string, unknown>)[n], n).toBe('function');
  });

  it('keeps the OBJ exporter out of the index', () => {
    expect('exportObj' in core).toBe(false);
  });
});
