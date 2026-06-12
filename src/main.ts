/**
 * Browser entry point. Wires:
 *   content load -> world construction -> tick driver -> Pixi render app -> HUD + input.
 */

import { ContentRegistry } from './content/registry.js';
import { loadContentBrowser } from './content/loader.js';
import { World } from './sim/world.js';
import { TickDriver } from './sim/tick.js';
import { createRenderApp } from './render/app.js';
import { attachInput, InputState } from './ui/input.js';
import { mountHud } from './ui/toolbar.js';

async function main(): Promise<void> {
  const appEl = document.getElementById('app')!;

  const registry = new ContentRegistry();
  await loadContentBrowser(registry, (level, msg) => {
    if (level === 'error') console.error(msg);
    else console.warn(msg);
  });

  const world = new World({
    size: { width: 96, height: 96 },
    seed: 0x5c17,
    registry,
  });

  // Tick driver uses the growth samples from balance so mods can tune growth feel.
  const tick = new TickDriver(world, {
    tickHz: 10,
    growthSamplesPerTick: registry.balance.growth.samplesPerTick,
  });

  const render = await createRenderApp(appEl, world, tick);

  const input: InputState = {
    tool: 'road',
    isDragging: false,
    isPanning: false,
    lastTile: null,
    panAnchor: null,
  };
  attachInput(render, input);
  mountHud(appEl, render, input);

  world.bus.emit('logMessage', {
    level: 'info',
    text: 'Welcome, Planner. Place roads (1), then paint Dwellings, Trade, and Works zones.',
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const box = document.createElement('pre');
  box.style.color = '#e68b7b';
  box.style.padding = '1rem';
  box.textContent = 'City Builder failed to start:\n\n' + (err as Error).stack;
  document.body.appendChild(box);
});
