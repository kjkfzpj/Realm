/**
 * Building lifecycle: growth from zoned+serviced tiles, demolition, census.
 *
 * V1 growth rule (intentionally simple, tuned in content/core/balance.json):
 *   Each simulation step visits a bounded random sample of zoned tiles. For
 *   each candidate it checks:
 *     - tile is Ground, has no building, has road access
 *     - zone matches a building definition's zone
 *     - treasury can afford the construction cost
 *   If all hold, a building of that def is placed, occupants assigned, and
 *   the treasury debited. Later phases add utility, desirability, and density
 *   gates. This V1 version keeps the feedback loop visible within seconds.
 */

import { Grid } from './grid.js';
import { EventBus, SimEvents } from './events.js';
import { Rng } from './rng.js';
import { Building, BuildingId, EconomyState, TileKind, ZoneKind } from './types.js';
import { BuildingDef, ContentRegistry } from '../content/registry.js';
import { ZoningSystem } from './zoning.js';

export class BuildingSystem {
  buildings: Map<BuildingId, Building> = new Map();
  private nextId: BuildingId = 1;

  constructor(
    private grid: Grid,
    private zoning: ZoningSystem,
    private registry: ContentRegistry,
    private rng: Rng,
  ) {}

  /** Visit up to `sampleSize` random tiles trying to grow a building. */
  step(
    sampleSize: number,
    economy: EconomyState,
    bus?: EventBus<SimEvents>,
  ): number {
    let grown = 0;
    const { width, height } = this.grid;
    for (let i = 0; i < sampleSize; i++) {
      const x = this.rng.nextInt(0, width - 1);
      const y = this.rng.nextInt(0, height - 1);
      if (!this.tryGrowAt(x, y, economy, bus)) continue;
      grown++;
    }
    return grown;
  }

  private tryGrowAt(
    x: number,
    y: number,
    economy: EconomyState,
    bus?: EventBus<SimEvents>,
  ): boolean {
    const { grid } = this;
    if (grid.getKind(x, y) !== TileKind.Ground) return false;
    const idx = grid.idx(x, y);
    if (grid.buildingId[idx] !== 0) return false;
    const zone = grid.getZone(x, y) as ZoneKind;
    if (zone === ZoneKind.None) return false;
    if (!this.zoning.hasRoadAccess(x, y)) return false;

    const defs = this.registry.buildingsByZone(zone);
    if (defs.length === 0) return false;

    const def = this.rng.pick(defs);
    if (!def) return false;
    if (economy.treasury < def.cost) return false;

    return this.place(def, x, y, economy, bus) !== null;
  }

  /** Place a building unconditionally (used by tests and tools). */
  place(
    def: BuildingDef,
    x: number,
    y: number,
    economy: EconomyState,
    bus?: EventBus<SimEvents>,
  ): Building | null {
    const idx = this.grid.idx(x, y);
    if (this.grid.getKind(x, y) !== TileKind.Ground) return null;
    if (this.grid.buildingId[idx] !== 0) return null;
    const id = this.nextId++;
    const b: Building = {
      id,
      defId: def.id,
      tile: idx,
      size: def.size,
      level: 1,
      occupants: def.provides.housing ?? def.provides.jobs ?? 0,
      happiness: 50,
      connected: true,
    };
    this.buildings.set(id, b);
    this.grid.buildingId[idx] = id;
    economy.treasury -= def.cost;
    bus?.emit('buildingPlaced', { buildingId: id, defId: def.id, tile: idx });
    return b;
  }

  remove(buildingId: BuildingId, bus?: EventBus<SimEvents>): boolean {
    const b = this.buildings.get(buildingId);
    if (!b) return false;
    this.buildings.delete(buildingId);
    this.grid.buildingId[b.tile] = 0;
    bus?.emit('buildingRemoved', { buildingId });
    return true;
  }

  census(): { population: number; jobs: number } {
    let population = 0;
    let jobs = 0;
    for (const b of this.buildings.values()) {
      const def = this.registry.getBuilding(b.defId);
      if (!def) continue;
      population += def.provides.housing ?? 0;
      jobs += def.provides.jobs ?? 0;
    }
    return { population, jobs };
  }
}
