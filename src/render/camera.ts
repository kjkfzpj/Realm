/**
 * 2D camera for a top-down tile map.
 *
 * World coordinates are in tiles (floats). Screen coordinates are CSS pixels.
 * A camera carries a position (the world-space tile at the screen centre) and
 * a zoom (pixels per tile). All screen <-> world math lives here so the rest
 * of the renderer can stay dumb.
 */

export interface CameraState {
  /** Centre of view, in tile units. */
  cx: number;
  cy: number;
  /** Pixels per tile. */
  tileSize: number;
  /** Viewport size in CSS pixels. */
  viewW: number;
  viewH: number;
}

export class Camera {
  readonly state: CameraState;
  readonly minTileSize: number;
  readonly maxTileSize: number;

  constructor(
    initial: Partial<CameraState> = {},
    { minTileSize = 12, maxTileSize = 64 }: { minTileSize?: number; maxTileSize?: number } = {},
  ) {
    this.state = {
      cx: initial.cx ?? 0,
      cy: initial.cy ?? 0,
      tileSize: initial.tileSize ?? 32,
      viewW: initial.viewW ?? 1280,
      viewH: initial.viewH ?? 720,
    };
    this.minTileSize = minTileSize;
    this.maxTileSize = maxTileSize;
  }

  resize(w: number, h: number): void {
    this.state.viewW = w;
    this.state.viewH = h;
  }

  panBy(dxTiles: number, dyTiles: number): void {
    this.state.cx += dxTiles;
    this.state.cy += dyTiles;
  }

  /**
   * Zoom toward a screen pixel so the tile under the cursor stays put. Common
   * expectation for any tile-based RTS/city sim.
   */
  zoomAt(screenX: number, screenY: number, factor: number): void {
    const before = this.screenToWorld(screenX, screenY);
    const next = this.state.tileSize * factor;
    this.state.tileSize = Math.max(this.minTileSize, Math.min(this.maxTileSize, next));
    const after = this.screenToWorld(screenX, screenY);
    this.state.cx += before.x - after.x;
    this.state.cy += before.y - after.y;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const s = this.state;
    return {
      x: s.cx + (sx - s.viewW / 2) / s.tileSize,
      y: s.cy + (sy - s.viewH / 2) / s.tileSize,
    };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const s = this.state;
    return {
      x: (wx - s.cx) * s.tileSize + s.viewW / 2,
      y: (wy - s.cy) * s.tileSize + s.viewH / 2,
    };
  }

  screenToTile(sx: number, sy: number): { tx: number; ty: number } {
    const w = this.screenToWorld(sx, sy);
    return { tx: Math.floor(w.x), ty: Math.floor(w.y) };
  }
}
