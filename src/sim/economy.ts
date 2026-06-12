/**
 * Taxation + upkeep. Runs on month change.
 *
 * Income: sum over buildings of (occupants * taxRate[zone]).
 * Upkeep: sum over road tiles * roadUpkeepPerTile + sum of building upkeep.
 *
 * All numbers are integer currency units; fractional income is floored per
 * building to keep things deterministic and easy to display.
 */

import { BuildingSystem } from './buildings.js';
import { Grid } from './grid.js';
import { ContentRegistry } from '../content/registry.js';
import { EconomyState, TileKind, ZoneKind } from './types.js';

export interface EconomyBalance {
  roadUpkeepPerTile: number;
  startingTreasury: number;
  taxRateResidential: number;
  taxRateCommercial: number;
  taxRateIndustrial: number;
}

export class EconomySystem {
  constructor(
    private grid: Grid,
    private buildings: BuildingSystem,
    private registry: ContentRegistry,
  ) {}

  applyMonth(state: EconomyState): void {
    let income = 0;
    let upkeep = 0;

    for (const b of this.buildings.buildings.values()) {
      const def = this.registry.getBuilding(b.defId);
      if (!def) continue;
      upkeep += def.upkeep;
      const rate = this.rateForZone(state, def.zone);
      income += Math.floor(b.occupants * rate);
    }

    // Road upkeep: count road tiles.
    const kind = this.grid.kind;
    let roadTiles = 0;
    for (let i = 0; i < kind.length; i++) if (kind[i] === TileKind.Road) roadTiles++;
    const roadUpkeep = roadTiles * this.registry.balance.economy.roadUpkeepPerTile;

    state.monthlyIncome = income;
    state.monthlyUpkeep = upkeep + roadUpkeep;
    state.treasury += state.monthlyIncome - state.monthlyUpkeep;
  }

  private rateForZone(state: EconomyState, zone: string): number {
    switch (zone) {
      case 'residential':
        return state.taxRateResidential;
      case 'commercial':
        return state.taxRateCommercial;
      case 'industrial':
        return state.taxRateIndustrial;
      default:
        return 0;
    }
  }

  static initialState(balance: EconomyBalance): EconomyState {
    return {
      treasury: balance.startingTreasury,
      monthlyIncome: 0,
      monthlyUpkeep: 0,
      taxRateResidential: balance.taxRateResidential,
      taxRateCommercial: balance.taxRateCommercial,
      taxRateIndustrial: balance.taxRateIndustrial,
    };
  }

  static zoneKindToString(z: ZoneKind): string {
    switch (z) {
      case ZoneKind.Residential:
        return 'residential';
      case ZoneKind.Commercial:
        return 'commercial';
      case ZoneKind.Industrial:
        return 'industrial';
      default:
        return 'none';
    }
  }
}
