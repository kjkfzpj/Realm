/**
 * Shared simulation types. Pure data — no behaviour, no imports from render/ui.
 *
 * Tile coordinates use (x, y) integer grid space with origin at top-left.
 * Linear tile indices are always `y * width + x`.
 */

export type TileIndex = number;
export type BuildingId = number;
export type NodeId = number;
export type EdgeId = number;

export const enum TileKind {
  Ground = 0,
  Water = 1,
  Road = 2,
}

export const enum ZoneKind {
  None = 0,
  Residential = 1,
  Commercial = 2,
  Industrial = 3,
}

export const ZONE_NAMES: Record<ZoneKind, string> = {
  [ZoneKind.None]: 'Unzoned',
  [ZoneKind.Residential]: 'Dwellings',
  [ZoneKind.Commercial]: 'Trade',
  [ZoneKind.Industrial]: 'Works',
};

export interface GridSize {
  readonly width: number;
  readonly height: number;
}

/** A road graph node sits at an intersection or dead-end. */
export interface RoadNode {
  id: NodeId;
  tile: TileIndex;
  edges: EdgeId[];
}

/** A road graph edge is a straight run of road tiles between two nodes. */
export interface RoadEdge {
  id: EdgeId;
  a: NodeId;
  b: NodeId;
  tiles: TileIndex[];
  length: number;
}

export interface Building {
  id: BuildingId;
  defId: string;
  tile: TileIndex;
  size: readonly [number, number];
  level: number;
  occupants: number;
  happiness: number;
  connected: boolean;
}

/** Economy snapshot. All money is integer currency units. */
export interface EconomyState {
  treasury: number;
  monthlyIncome: number;
  monthlyUpkeep: number;
  taxRateResidential: number;
  taxRateCommercial: number;
  taxRateIndustrial: number;
}

export interface Clock {
  tick: number;
  day: number;
  month: number;
  year: number;
  ticksPerDay: number;
  daysPerMonth: number;
  monthsPerYear: number;
}

export interface Demand {
  residential: number;
  commercial: number;
  industrial: number;
}

/** Progression tier names are ours — not borrowed from any franchise. */
export const enum Tier {
  Outpost = 0,
  Hamlet = 1,
  Town = 2,
  Borough = 3,
  Metropolis = 4,
}

export const TIER_NAMES: Record<Tier, string> = {
  [Tier.Outpost]: 'Outpost',
  [Tier.Hamlet]: 'Hamlet',
  [Tier.Town]: 'Town',
  [Tier.Borough]: 'Borough',
  [Tier.Metropolis]: 'Metropolis',
};
