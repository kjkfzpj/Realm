/**
 * Save / load.
 *
 * Design goals:
 *   - JSON-serialisable for maximum tooling reach (user can inspect saves).
 *   - Explicit `schemaVersion` so future migrations can be written in one
 *     place as the format evolves.
 *   - Typed arrays are packed to base64 to keep the file compact and to
 *     round-trip cleanly through Electron's file dialogs.
 *
 * V1 persists grid tile data, buildings, economy, clock, RNG state, and the
 * content-pack manifest id list so load can reject saves that reference
 * buildings no longer present.
 */

import { Building, EconomyState, Clock } from './types.js';
import { World } from './world.js';

const SAVE_SCHEMA_VERSION = 1;

export interface SaveFile {
  schemaVersion: number;
  seed: number;
  size: { width: number; height: number };
  contentPacks: string[];
  grid: {
    kind: string; // base64
    zone: string; // base64
    buildingId: string; // base64
  };
  buildings: Building[];
  nextBuildingId: number;
  economy: EconomyState;
  clock: Clock;
  rngState: number;
  tier: number;
}

export function saveWorld(world: World, nextBuildingId: number): SaveFile {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed: world.seed,
    size: { width: world.size.width, height: world.size.height },
    contentPacks: world.registry.loadedPackIds(),
    grid: {
      kind: bytesToBase64(world.grid.kind),
      zone: bytesToBase64(world.grid.zone),
      buildingId: bytesToBase64(new Uint8Array(world.grid.buildingId.buffer.slice(0))),
    },
    buildings: [...world.buildings.buildings.values()],
    nextBuildingId,
    economy: { ...world.economyState },
    clock: { ...world.clock },
    rngState: world.rng.snapshot(),
    tier: world.milestones.tier,
  };
}

export function loadWorld(world: World, save: SaveFile): void {
  if (save.schemaVersion !== SAVE_SCHEMA_VERSION) {
    throw new Error(`Unsupported save schema v${save.schemaVersion}`);
  }
  if (save.size.width !== world.size.width || save.size.height !== world.size.height) {
    throw new Error('Save size does not match world size.');
  }
  world.grid.kind.set(base64ToBytes(save.grid.kind));
  world.grid.zone.set(base64ToBytes(save.grid.zone));
  const bid = new Uint16Array(base64ToBytes(save.grid.buildingId).buffer);
  world.grid.buildingId.set(bid);
  world.buildings.buildings.clear();
  for (const b of save.buildings) world.buildings.buildings.set(b.id, b);
  (world.buildings as any).nextId = save.nextBuildingId;
  world.economyState = { ...save.economy };
  world.clock = { ...save.clock };
  world.rng.restore(save.rngState);
  world.roads.markDirty();
  (world.milestones as any).tier = save.tier;
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof btoa === 'function') return btoa(s);
  // Node fallback.
  return Buffer.from(s, 'binary').toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const SAVE_VERSION = SAVE_SCHEMA_VERSION;
