/**
 * Tile + zone + road + building layer.
 *
 * Rendering strategy: we only redraw inside a Graphics object each frame. At
 * the viewport sizes we target (typically <= 80x45 visible tiles), fill-and-
 * stroke per tile is comfortably under a millisecond. This avoids keeping a
 * per-tile sprite instance alive and sidesteps atlas management for V1; when
 * profiling shows it, we will switch to a batched sprite approach.
 */

import { Graphics, Container } from 'pixi.js';
import { World } from '../sim/world.js';
import { Camera } from './camera.js';
import { TileKind, ZoneKind } from '../sim/types.js';

const COLORS = {
  ground: 0x1f2a20,
  groundAlt: 0x243028,
  water: 0x1b3a4b,
  road: 0x2f2f33,
  roadEdge: 0x16161a,
  gridLine: 0x0b0f0c,
  zoneR: 0x4f8a6b,
  zoneC: 0x3a6ea5,
  zoneI: 0xa07040,
  building: 0xd7c8a7,
  buildingShadow: 0x000000,
  hoverOutline: 0xffffff,
};

export class TileLayer {
  readonly root = new Container();
  private gfx = new Graphics();
  hoverTile: { x: number; y: number } | null = null;

  constructor(
    private world: World,
    private camera: Camera,
  ) {
    this.root.addChild(this.gfx);
  }

  render(): void {
    const g = this.gfx;
    g.clear();

    const s = this.camera.state;
    const ts = s.tileSize;
    const w = this.world.grid.width;
    const h = this.world.grid.height;

    const worldTL = this.camera.screenToWorld(0, 0);
    const worldBR = this.camera.screenToWorld(s.viewW, s.viewH);
    const x0 = Math.max(0, Math.floor(worldTL.x) - 1);
    const y0 = Math.max(0, Math.floor(worldTL.y) - 1);
    const x1 = Math.min(w - 1, Math.ceil(worldBR.x) + 1);
    const y1 = Math.min(h - 1, Math.ceil(worldBR.y) + 1);

    // 1) Ground / water tiles.
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const kind = this.world.grid.getKind(x, y);
        const sp = this.camera.worldToScreen(x, y);
        const base = kind === TileKind.Water ? COLORS.water : ((x + y) & 1) ? COLORS.ground : COLORS.groundAlt;
        g.rect(sp.x, sp.y, ts, ts).fill(base);
      }
    }

    // 2) Zones (tinted under roads/buildings for readability).
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const zone = this.world.grid.getZone(x, y) as ZoneKind;
        if (zone === ZoneKind.None) continue;
        const tint =
          zone === ZoneKind.Residential ? COLORS.zoneR : zone === ZoneKind.Commercial ? COLORS.zoneC : COLORS.zoneI;
        const sp = this.camera.worldToScreen(x, y);
        g.rect(sp.x + 1, sp.y + 1, ts - 2, ts - 2).fill({ color: tint, alpha: 0.32 });
      }
    }

    // 3) Roads.
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (this.world.grid.getKind(x, y) !== TileKind.Road) continue;
        const sp = this.camera.worldToScreen(x, y);
        g.rect(sp.x, sp.y, ts, ts).fill(COLORS.road);
        // Lane marking: thin centre line along either axis where neighbours are roads.
        const grid = this.world.grid;
        const nNorth = y > 0 && grid.getKind(x, y - 1) === TileKind.Road;
        const nSouth = y + 1 < grid.height && grid.getKind(x, y + 1) === TileKind.Road;
        const nEast = x + 1 < grid.width && grid.getKind(x + 1, y) === TileKind.Road;
        const nWest = x > 0 && grid.getKind(x - 1, y) === TileKind.Road;
        const mid = ts / 2;
        if (nNorth || nSouth) {
          g.rect(sp.x + mid - 1, sp.y, 2, ts).fill({ color: 0xa0a0a0, alpha: 0.35 });
        }
        if (nEast || nWest) {
          g.rect(sp.x, sp.y + mid - 1, ts, 2).fill({ color: 0xa0a0a0, alpha: 0.35 });
        }
      }
    }

    // 4) Buildings.
    for (const b of this.world.buildings.buildings.values()) {
      const [x, y] = this.world.grid.xy(b.tile);
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const def = this.world.registry.getBuilding(b.defId);
      const color = def ? parseInt(def.color.slice(1), 16) : COLORS.building;
      const sp = this.camera.worldToScreen(x, y);
      const pad = Math.max(1, ts * 0.1);
      g.rect(sp.x + pad, sp.y + pad, ts - pad * 2, ts - pad * 2).fill(color);
      // Shadow strip.
      g.rect(sp.x + pad, sp.y + ts - pad - 2, ts - pad * 2, 2).fill({ color: COLORS.buildingShadow, alpha: 0.4 });
    }

    // 5) Hover outline.
    if (this.hoverTile) {
      const { x, y } = this.hoverTile;
      if (x >= 0 && y >= 0 && x < w && y < h) {
        const sp = this.camera.worldToScreen(x, y);
        g.rect(sp.x + 0.5, sp.y + 0.5, ts - 1, ts - 1).stroke({ color: COLORS.hoverOutline, width: 1.5, alpha: 0.9 });
      }
    }
  }
}
