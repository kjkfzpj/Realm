/**
 * Headless sim driver: boots the world from disk content, paints a scripted
 * starter layout, runs a fixed number of ticks, and prints a state summary.
 * The only way to validate sim correctness in a display-less dev environment.
 *
 * Usage: `npm run sim` or `tsx src/sim/headless.ts`.
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ContentRegistry } from '../content/registry.js';
import { loadContentNode } from '../content/loader-node.js';
import { World } from './world.js';
import { TickDriver } from './tick.js';
import { ZoneKind, TIER_NAMES } from './types.js';

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, '..', '..');

  const registry = new ContentRegistry();
  await loadContentNode(
    registry,
    {
      contentDir: resolve(projectRoot, 'content'),
      modsDir: resolve(projectRoot, 'mods'),
    },
    (level, msg) => {
      const tag = level === 'error' ? 'ERR' : 'WARN';
      console.log(`[${tag}] ${msg}`);
    },
  );

  console.log(`content packs loaded: ${registry.loadedPackIds().join(', ')}`);
  console.log(`building defs: ${registry.allBuildings().length}`);

  const world = new World({
    size: { width: 48, height: 48 },
    seed: 1337,
    registry,
  });
  const tick = new TickDriver(world, {
    tickHz: 10,
    growthSamplesPerTick: registry.balance.growth.samplesPerTick,
  });

  // Paint a simple starter: a main cross of roads and rectangles of zones.
  paintScenario(world);

  const TICKS = 1200;
  for (let i = 0; i < TICKS; i++) tick.step();

  const census = world.buildings.census();
  console.log('--- after %d ticks ---', TICKS);
  console.log(`date        : Y${world.clock.year} M${world.clock.month + 1} D${world.clock.day + 1}`);
  console.log(`tier        : ${TIER_NAMES[world.milestones.tier]}`);
  console.log(`population  : ${census.population}`);
  console.log(`jobs        : ${census.jobs}`);
  console.log(`buildings   : ${world.buildings.buildings.size}`);
  console.log(`treasury    : ${world.economyState.treasury}`);
  console.log(`income      : ${world.economyState.monthlyIncome}`);
  console.log(`upkeep      : ${world.economyState.monthlyUpkeep}`);

  // Invariants the caller can grep for in CI.
  let ok = true;
  if (Number.isNaN(world.economyState.treasury)) ok = false;
  if (world.buildings.buildings.size < 1) ok = false;
  console.log(ok ? 'SIM OK' : 'SIM FAILED');
  if (!ok) process.exitCode = 1;
}

function paintScenario(world: World): void {
  const { width, height } = world.size;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  // Cross of roads through the middle.
  for (let x = 4; x < width - 4; x++) world.roads.place(x, cy, world.bus);
  for (let y = 4; y < height - 4; y++) world.roads.place(cx, y, world.bus);
  // Some side streets.
  for (let y = 4; y < height - 4; y++) world.roads.place(cx - 6, y, world.bus);
  for (let y = 4; y < height - 4; y++) world.roads.place(cx + 6, y, world.bus);
  // Residential block north, commercial east, industrial south.
  world.zoning.paintRect(cx - 5, 5, cx - 2, cy - 1, ZoneKind.Residential, world.bus);
  world.zoning.paintRect(cx + 2, 5, cx + 5, cy - 1, ZoneKind.Residential, world.bus);
  world.zoning.paintRect(cx + 7, cy - 6, cx + 12, cy - 1, ZoneKind.Commercial, world.bus);
  world.zoning.paintRect(cx - 12, cy + 1, cx - 7, cy + 6, ZoneKind.Industrial, world.bus);
  world.roads.ensureFresh();
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
