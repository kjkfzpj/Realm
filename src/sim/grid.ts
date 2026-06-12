/**
 * Flat-array tile grid. Three parallel typed arrays indexed by `y * width + x`.
 *
 *   kind      : TileKind (ground / water / road)
 *   zone      : ZoneKind (none / R / C / I)
 *   buildingId: u16, 0 means "no building"
 *
 * Keeping the grid as typed arrays keeps hot-path iteration cache-friendly
 * and gives us cheap structural cloning for save/load.
 */

import { GridSize, TileIndex, TileKind, ZoneKind } from './types.js';

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly kind: Uint8Array;
  readonly zone: Uint8Array;
  readonly buildingId: Uint16Array;

  constructor(size: GridSize) {
    this.width = size.width;
    this.height = size.height;
    const n = size.width * size.height;
    this.kind = new Uint8Array(n);
    this.zone = new Uint8Array(n);
    this.buildingId = new Uint16Array(n);
  }

  idx(x: number, y: number): TileIndex {
    return y * this.width + x;
  }

  xy(i: TileIndex): [number, number] {
    return [i % this.width, Math.floor(i / this.width)];
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  getKind(x: number, y: number): TileKind {
    return this.kind[this.idx(x, y)] as TileKind;
  }

  setKind(x: number, y: number, k: TileKind): void {
    this.kind[this.idx(x, y)] = k;
  }

  getZone(x: number, y: number): ZoneKind {
    return this.zone[this.idx(x, y)] as ZoneKind;
  }

  setZone(x: number, y: number, z: ZoneKind): void {
    this.zone[this.idx(x, y)] = z;
  }

  /** Four-connected neighbours inside bounds. */
  *neighbours4(x: number, y: number): IterableIterator<[number, number]> {
    if (x > 0) yield [x - 1, y];
    if (x + 1 < this.width) yield [x + 1, y];
    if (y > 0) yield [x, y - 1];
    if (y + 1 < this.height) yield [x, y + 1];
  }

  /** Returns the count of road neighbours at (x, y). Useful for zone access. */
  roadNeighbourCount(x: number, y: number): number {
    let n = 0;
    for (const [nx, ny] of this.neighbours4(x, y)) {
      if (this.getKind(nx, ny) === TileKind.Road) n++;
    }
    return n;
  }
}
