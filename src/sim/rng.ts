/**
 * Seeded deterministic PRNG. All randomness in the sim must route through here
 * so that a given seed + input sequence produces identical cities.
 *
 * Algorithm: mulberry32 — fast, good enough for simulation, single u32 state.
 */

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  /** Returns a 32-bit unsigned integer and advances state. */
  nextU32(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Float in [0, 1). */
  nextFloat(): number {
    return this.nextU32() / 0x1_0000_0000;
  }

  /** Integer in [min, max]. */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  /** Roll a probability check. */
  chance(p: number): boolean {
    return this.nextFloat() < p;
  }

  /** Pick one element from an array; returns undefined on empty arrays. */
  pick<T>(xs: readonly T[]): T | undefined {
    if (xs.length === 0) return undefined;
    return xs[this.nextInt(0, xs.length - 1)];
  }

  snapshot(): number {
    return this.state;
  }

  restore(state: number): void {
    this.state = state >>> 0;
  }
}
