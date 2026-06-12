/**
 * Fixed-step simulation driver. The render loop calls `advance(dtMs)`; an
 * accumulator decides how many simulation steps to run this frame. Each step
 * is exactly `1000 / tickHz` milliseconds of sim time regardless of render
 * fps, which keeps the simulation reproducible at any frame rate.
 *
 * System order is load-bearing: road graph refresh -> zoning/building growth
 * -> economy (month boundary) -> milestones.
 */

import { World } from './world.js';

export interface TickConfig {
  tickHz: number;
  growthSamplesPerTick: number;
}

export class TickDriver {
  private accumulatorMs = 0;
  private readonly stepMs: number;
  private paused = false;
  private speedMultiplier = 1;

  constructor(private world: World, private cfg: TickConfig) {
    this.stepMs = 1000 / cfg.tickHz;
  }

  setPaused(p: boolean): void {
    this.paused = p;
  }

  isPaused(): boolean {
    return this.paused;
  }

  setSpeed(mult: number): void {
    // Clamp to reasonable sim speeds so the game never freezes on a huge dt.
    this.speedMultiplier = Math.max(0, Math.min(16, mult));
  }

  getSpeed(): number {
    return this.speedMultiplier;
  }

  /**
   * Advance sim time by `dtMs` wall-clock milliseconds. Returns the number of
   * steps actually executed so callers can measure sim load.
   */
  advance(dtMs: number): number {
    if (this.paused || this.speedMultiplier <= 0) {
      this.accumulatorMs = 0;
      return 0;
    }
    this.accumulatorMs += dtMs * this.speedMultiplier;
    let steps = 0;
    // Bound the loop so a long pause does not cause a catch-up storm.
    const maxSteps = 32;
    while (this.accumulatorMs >= this.stepMs && steps < maxSteps) {
      this.step();
      this.accumulatorMs -= this.stepMs;
      steps++;
    }
    if (steps === maxSteps) this.accumulatorMs = 0;
    return steps;
  }

  /** Execute exactly one sim step. Safe to call directly from tests. */
  step(): void {
    const w = this.world;
    w.roads.ensureFresh();

    // Zoning / building growth — bounded work per tick.
    w.buildings.step(this.cfg.growthSamplesPerTick, w.economyState, w.bus);

    // Advance clock.
    const c = w.clock;
    c.tick++;
    w.bus.emit('tick', { tick: c.tick });
    if (c.tick % c.ticksPerDay === 0) {
      c.day++;
      if (c.day >= c.daysPerMonth) {
        c.day = 0;
        c.month++;
        // End-of-month accounting.
        w.economy.applyMonth(w.economyState);
        if (c.month >= c.monthsPerYear) {
          c.month = 0;
          c.year++;
        }
        w.bus.emit('monthChanged', { month: c.month, year: c.year });
      }
      w.bus.emit('dayChanged', { day: c.day, month: c.month, year: c.year });
    }

    // Milestones based on current population.
    const census = w.buildings.census();
    w.milestones.update(census.population, w.bus);
  }
}
