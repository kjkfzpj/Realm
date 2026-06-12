/**
 * The root sim state container. Wires every subsystem together so the rest of
 * the engine holds exactly one `World` reference. Nothing here talks to the
 * renderer — that is strictly a one-way read.
 */

import { BuildingSystem } from './buildings.js';
import { Clock, Demand, EconomyState, GridSize } from './types.js';
import { ContentRegistry } from '../content/registry.js';
import { EconomySystem } from './economy.js';
import { EventBus, SimEvents } from './events.js';
import { Grid } from './grid.js';
import { Milestones } from './milestones.js';
import { Rng } from './rng.js';
import { RoadGraph } from './roads.js';
import { ZoningSystem } from './zoning.js';

export interface WorldOptions {
  size: GridSize;
  seed: number;
  registry: ContentRegistry;
}

export class World {
  readonly size: GridSize;
  readonly seed: number;
  readonly registry: ContentRegistry;

  readonly rng: Rng;
  readonly grid: Grid;
  readonly roads: RoadGraph;
  readonly zoning: ZoningSystem;
  readonly buildings: BuildingSystem;
  readonly economy: EconomySystem;
  readonly milestones: Milestones;
  readonly bus: EventBus<SimEvents>;

  economyState: EconomyState;
  demand: Demand;
  clock: Clock;

  constructor(opts: WorldOptions) {
    this.size = opts.size;
    this.seed = opts.seed;
    this.registry = opts.registry;
    this.rng = new Rng(opts.seed);
    this.grid = new Grid(opts.size);
    this.roads = new RoadGraph(this.grid);
    this.zoning = new ZoningSystem(this.grid);
    this.buildings = new BuildingSystem(this.grid, this.zoning, this.registry, this.rng);
    this.economy = new EconomySystem(this.grid, this.buildings, this.registry);
    this.milestones = new Milestones(this.registry.balance.milestones);
    this.bus = new EventBus();
    this.economyState = EconomySystem.initialState(this.registry.balance.economy);
    this.demand = { residential: 50, commercial: 30, industrial: 20 };
    this.clock = {
      tick: 0,
      day: 0,
      month: 0,
      year: 0,
      ticksPerDay: 10,
      daysPerMonth: 30,
      monthsPerYear: 12,
    };
  }
}
