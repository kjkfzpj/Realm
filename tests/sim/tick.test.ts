import { describe, it, expect } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentRegistry } from '../../src/content/registry.js';
import { loadContentNode } from '../../src/content/loader-node.js';
import { World } from '../../src/sim/world.js';
import { TickDriver } from '../../src/sim/tick.js';
import { ZoneKind } from '../../src/sim/types.js';

async function bootstrapWorld(): Promise<{ world: World; tick: TickDriver }> {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, '..', '..');
  const registry = new ContentRegistry();
  await loadContentNode(
    registry,
    { contentDir: resolve(root, 'content') },
    () => undefined,
  );
  const world = new World({ size: { width: 24, height: 24 }, seed: 1, registry });
  const tick = new TickDriver(world, {
    tickHz: 10,
    growthSamplesPerTick: registry.balance.growth.samplesPerTick,
  });
  return { world, tick };
}

describe('Tick driver + growth loop', () => {
  it('clock advances and days roll over', async () => {
    const { world, tick } = await bootstrapWorld();
    for (let i = 0; i < 15; i++) tick.step();
    expect(world.clock.tick).toBe(15);
    expect(world.clock.day).toBe(1);
  });

  it('growing zones produce buildings and reduce treasury', async () => {
    const { world, tick } = await bootstrapWorld();
    // Lay out a 3-tile road and adjacent residential zone.
    for (let x = 2; x <= 10; x++) world.roads.place(x, 5);
    for (let x = 2; x <= 10; x++) world.zoning.paint(x, 4, ZoneKind.Residential);
    const startingTreasury = world.economyState.treasury;
    for (let i = 0; i < 400; i++) tick.step();
    expect(world.buildings.buildings.size).toBeGreaterThan(0);
    expect(world.economyState.treasury).toBeLessThan(startingTreasury);
    const census = world.buildings.census();
    expect(census.population).toBeGreaterThan(0);
  });

  it('pausing stops the clock', async () => {
    const { world, tick } = await bootstrapWorld();
    tick.setPaused(true);
    tick.advance(10_000);
    expect(world.clock.tick).toBe(0);
  });

  it('is deterministic for a fixed seed', async () => {
    const a = await bootstrapWorld();
    const b = await bootstrapWorld();
    for (let x = 2; x <= 10; x++) {
      a.world.roads.place(x, 5);
      a.world.zoning.paint(x, 4, ZoneKind.Residential);
      b.world.roads.place(x, 5);
      b.world.zoning.paint(x, 4, ZoneKind.Residential);
    }
    for (let i = 0; i < 200; i++) {
      a.tick.step();
      b.tick.step();
    }
    expect(a.world.buildings.buildings.size).toBe(b.world.buildings.buildings.size);
    expect(a.world.economyState.treasury).toBe(b.world.economyState.treasury);
  });
});
