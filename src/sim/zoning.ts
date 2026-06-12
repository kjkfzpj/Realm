/**
 * Zoning: painting zone kinds onto ground tiles adjacent to roads.
 *
 * V1 rules:
 *   - Zones can only be painted on Ground tiles with no building and no road.
 *   - A zoned tile is "valid" if it is orthogonally adjacent to a road tile.
 *     Invalid tiles keep their zone mark but will not develop buildings.
 *   - Removing a zone is legal any time; if a building occupies the tile the
 *     building is flagged for abandonment by the building system (Phase 2+).
 */

import { Grid } from './grid.js';
import { EventBus, SimEvents } from './events.js';
import { TileKind, ZoneKind } from './types.js';

export class ZoningSystem {
  constructor(private grid: Grid) {}

  paint(x: number, y: number, zone: ZoneKind, bus?: EventBus<SimEvents>): boolean {
    if (!this.grid.inBounds(x, y)) return false;
    if (this.grid.getKind(x, y) !== TileKind.Ground) return false;
    if (this.grid.buildingId[this.grid.idx(x, y)] !== 0) return false;
    this.grid.setZone(x, y, zone);
    bus?.emit('zonePainted', { tile: this.grid.idx(x, y), zone });
    return true;
  }

  clear(x: number, y: number, bus?: EventBus<SimEvents>): boolean {
    return this.paint(x, y, ZoneKind.None, bus);
  }

  /** A zoned tile develops if it is adjacent to a road. */
  hasRoadAccess(x: number, y: number): boolean {
    return this.grid.roadNeighbourCount(x, y) > 0;
  }

  /**
   * Convenience: paint a filled rectangle of zone. Returns the count actually
   * painted (tiles that were not eligible are skipped silently).
   */
  paintRect(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    zone: ZoneKind,
    bus?: EventBus<SimEvents>,
  ): number {
    const [lx, hx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [ly, hy] = y0 <= y1 ? [y0, y1] : [y1, y0];
    let painted = 0;
    for (let y = ly; y <= hy; y++) {
      for (let x = lx; x <= hx; x++) {
        if (this.paint(x, y, zone, bus)) painted++;
      }
    }
    return painted;
  }
}
