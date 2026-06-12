/**
 * Progression tiers based on population thresholds. Emits tierChanged when
 * the city crosses a threshold. Thresholds live in balance.json so they are
 * moddable and we do not ship franchise-borrowed numbers.
 */

import { EventBus, SimEvents } from './events.js';
import { Tier } from './types.js';

export interface MilestoneBalance {
  tierPopulationThresholds: number[]; // length 5, index matches Tier enum
}

export class Milestones {
  tier: Tier = Tier.Outpost;

  constructor(private balance: MilestoneBalance) {}

  update(population: number, bus?: EventBus<SimEvents>): void {
    let newTier: Tier = Tier.Outpost;
    const t = this.balance.tierPopulationThresholds;
    for (let i = t.length - 1; i >= 0; i--) {
      if (population >= t[i]) {
        newTier = i as Tier;
        break;
      }
    }
    if (newTier !== this.tier) {
      this.tier = newTier;
      bus?.emit('tierChanged', { tier: newTier });
    }
  }
}
