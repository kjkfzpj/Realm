/**
 * Public mod API surface. A mod is a folder under `mods/` with a manifest
 * identical to the one used by core content. Mods can additionally register
 * lightweight event hooks at load time (Phase 4 will expand this).
 */

import { EventBus, SimEvents } from '../sim/events.js';
import { World } from '../sim/world.js';

export interface ModContext {
  readonly world: World;
  readonly bus: EventBus<SimEvents>;
  log(level: 'info' | 'warn' | 'error', text: string): void;
}

export interface ModHooks {
  onTick?: (ctx: ModContext, tick: number) => void;
  onBuildingPlaced?: (ctx: ModContext, ev: SimEvents['buildingPlaced']) => void;
  onZonePainted?: (ctx: ModContext, ev: SimEvents['zonePainted']) => void;
}

export function attachMod(ctx: ModContext, hooks: ModHooks): () => void {
  const offs: Array<() => void> = [];
  if (hooks.onTick) {
    offs.push(ctx.bus.on('tick', (ev) => safeCall(ctx, () => hooks.onTick!(ctx, ev.tick))));
  }
  if (hooks.onBuildingPlaced) {
    offs.push(
      ctx.bus.on('buildingPlaced', (ev) =>
        safeCall(ctx, () => hooks.onBuildingPlaced!(ctx, ev)),
      ),
    );
  }
  if (hooks.onZonePainted) {
    offs.push(
      ctx.bus.on('zonePainted', (ev) => safeCall(ctx, () => hooks.onZonePainted!(ctx, ev))),
    );
  }
  return () => offs.forEach((o) => o());
}

function safeCall(ctx: ModContext, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    ctx.log('error', `mod hook threw: ${(err as Error).message}`);
  }
}
