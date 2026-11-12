import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { exportGlb } from '../src/core/export-glb';
import { inspectPlan } from '../src/core/inspect';
import { loadFixture } from './helpers';

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

// sha256 of the inspect text and of the .glb for three fixtures.
const pinned: Record<string, { inspect: string; glb: string }> = {
  'studio-30': {
    inspect: '7e1395b5df2491a476a099c7ade05791b163bd260c7c75e4afd52884505d3b3a',
    glb: 'b4c52bdf8bfe3954515ebf9328f092a734fb8262c7c479d301b41c4e6a2d7cf0',
  },
  'apartment-2br': {
    inspect: '6d6ecb874cadbc83eff418a389d410fccec638381d02bc5e7ade830125d247f4',
    glb: 'f3d9477702d0f12e378cf9992285b8a95114268f7dcd4fc4092fa3501486fb21',
  },
  'l-room': {
    inspect: '145528c285c66f73c349dd0eb0f5b94cdf66e13ed598950872dcec2294a93d63',
    glb: 'db8aade9c07930e13567ddab0e62d3b00e5ce51f116ada3258135777603a8ee9',
  },
};

describe('stable output', () => {
  it.each(Object.keys(pinned))('%s: inspect text and glb bytes did not change', (name) => {
    const plan = loadFixture(name);
    expect(sha256(inspectPlan(plan))).toBe(pinned[name].inspect);
    expect(sha256(exportGlb(plan))).toBe(pinned[name].glb);
  });
});
