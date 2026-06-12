import { describe, it, expect } from 'vitest';
import { Rng } from '../../src/sim/rng.js';

describe('Rng', () => {
  it('produces a deterministic stream from the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 1024; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('diverges for different seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    let anyDiff = false;
    for (let i = 0; i < 32; i++) if (a.nextU32() !== b.nextU32()) anyDiff = true;
    expect(anyDiff).toBe(true);
  });

  it('nextInt is bounded inclusively', () => {
    const r = new Rng(7);
    for (let i = 0; i < 2000; i++) {
      const v = r.nextInt(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('snapshot/restore resumes the same sequence', () => {
    const r = new Rng(99);
    for (let i = 0; i < 50; i++) r.nextU32();
    const s = r.snapshot();
    const next5 = [r.nextU32(), r.nextU32(), r.nextU32(), r.nextU32(), r.nextU32()];
    r.restore(s);
    expect([r.nextU32(), r.nextU32(), r.nextU32(), r.nextU32(), r.nextU32()]).toEqual(next5);
  });
});
