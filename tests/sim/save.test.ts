import { describe, it, expect } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentRegistry } from '../../src/content/registry.js';
import { loadContentNode } from '../../src/content/loader-node.js';
import { World } from '../../src/sim/world.js';
import { TickDriver } from '../../src/sim/tick.js';
import { saveWorld, loadWorld } from '../../src/sim/save.js';
import { ZoneKind, TileKind } from '../../src/sim/types.js';

async function boot(): Promise<{ world: World; tick: TickDriver; registry: ContentRegistry }> {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, '..', '..');
  const registry = new ContentRegistry();
  await loadContentNode(registry, { contentDir: resolve(root, 'content') }, () => undefined);
  const world = new World({ size: { width: 20, height: 20 }, seed: 2024, registry });
  const tick = new TickDriver(world, {
    tickHz: 10,
    growthSamplesPerTick: registry.balance.growth.samplesPerTick,
  });
  return { world, tick, registry };
}

describe('save/load round-trip', () => {
  it('preserves grid, buildings, clock, and economy', async () => {
    const a = await boot();
    for (let x = 2; x <= 8; x++) a.world.roads.place(x, 5);
    a.world.zoning.paintRect(2, 4, 8, 4, ZoneKind.Residential);
    for (let i = 0; i < 120; i++) a.tick.step();

    const json = JSON.stringify(saveWorld(a.world, (a.world.buildings as any).nextId));

    const b = await boot();
    loadWorld(b.world, JSON.parse(json));

    expect(b.world.clock.tick).toBe(a.world.clock.tick);
    expect(b.world.economyState.treasury).toBe(a.world.economyState.treasury);
    expect(b.world.buildings.buildings.size).toBe(a.world.buildings.buildings.size);
    // Spot check one tile.
    expect(b.world.grid.getKind(5, 5)).toBe(TileKind.Road);
  });
});
