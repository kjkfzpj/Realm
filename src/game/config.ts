// Central balance + tuning constants for the RTS. Keeping these in one place
// makes the game easy to tweak without hunting through systems.

export const WORLD = {
  size: 180, // world is size x size units, centered on origin
  groundColor: 0x4a7a3a,
};

export const COLORS = {
  player: 0x3d7bd6,
  playerDark: 0x24508f,
  enemy: 0xc23b3b,
  enemyDark: 0x7e2222,
  selection: 0x8fff6a,
  gold: 0xf2c14e,
  wood: 0x8a5a2b,
  food: 0xd14f4f,
  ghostOk: 0x6ad06a,
  ghostBad: 0xd06a6a,
};

export type Faction = 'player' | 'enemy';

export type ResourceType = 'food' | 'wood' | 'gold';

export interface ResourcePool {
  food: number;
  wood: number;
  gold: number;
}

// Unit stats
export const UNIT = {
  villager: {
    hp: 40,
    speed: 7.5,
    gatherRate: 6, // resource units per second while gathering
    carryCapacity: 12,
    buildRate: 28, // build progress (hp) per second
    attack: 3,
    attackRange: 1.6,
    attackCooldown: 1.2,
    radius: 0.7,
  },
  soldier: {
    hp: 110,
    speed: 6.5,
    attack: 14,
    attackRange: 1.9,
    attackCooldown: 1.0,
    radius: 0.8,
  },
  archer: {
    hp: 70,
    speed: 6.8,
    attack: 11,
    attackRange: 12,
    attackCooldown: 1.4,
    radius: 0.7,
  },
} as const;

export type UnitKind = keyof typeof UNIT;

// Building definitions
export interface BuildingDef {
  kind: BuildingKind;
  label: string;
  cost: Partial<ResourcePool>;
  maxHp: number;
  footprint: number; // square side length in world units
  popProvided: number; // housing it adds
  isDropOff: boolean; // can villagers deposit resources here?
  buildTime: number; // seconds of villager work to finish (scaled by buildRate)
}

export const BUILDINGS: Record<string, BuildingDef> = {
  towncenter: {
    kind: 'towncenter',
    label: 'Town Center',
    cost: { wood: 350 },
    maxHp: 2400,
    footprint: 8,
    popProvided: 5,
    isDropOff: true,
    buildTime: 1, // prebuilt at start
  },
  house: {
    kind: 'house',
    label: 'House',
    cost: { wood: 30 },
    maxHp: 550,
    footprint: 4,
    popProvided: 5,
    isDropOff: false,
    buildTime: 1,
  },
  barracks: {
    kind: 'barracks',
    label: 'Barracks',
    cost: { wood: 150 },
    maxHp: 1200,
    footprint: 6,
    popProvided: 0,
    isDropOff: false,
    buildTime: 1,
  },
  mill: {
    kind: 'mill',
    label: 'Mill',
    cost: { wood: 100 },
    maxHp: 600,
    footprint: 5,
    popProvided: 0,
    isDropOff: true,
    buildTime: 1,
  },
} as const;

export type BuildingKind = 'towncenter' | 'house' | 'barracks' | 'mill';

// Training costs and times
export const TRAIN = {
  villager: { cost: { food: 50 }, time: 8, from: 'towncenter' as BuildingKind, pop: 1 },
  soldier: { cost: { food: 60, gold: 20 }, time: 14, from: 'barracks' as BuildingKind, pop: 1 },
  archer: { cost: { wood: 25, gold: 45 }, time: 16, from: 'barracks' as BuildingKind, pop: 1 },
} as const;

export type TrainKind = keyof typeof TRAIN;

export const RESOURCE_NODE = {
  tree: { type: 'wood' as ResourceType, amount: 120, color: 0x2f6d34 },
  gold: { type: 'gold' as ResourceType, amount: 320, color: COLORS.gold },
  berry: { type: 'food' as ResourceType, amount: 220, color: 0xc0455a },
} as const;

export const STARTING_RESOURCES: ResourcePool = {
  food: 220,
  wood: 220,
  gold: 120,
};

export const MAX_POP = 60;
