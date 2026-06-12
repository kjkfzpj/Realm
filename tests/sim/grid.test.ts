import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/sim/grid.js';
import { TileKind, ZoneKind } from '../../src/sim/types.js';

describe('Grid', () => {
  it('stores and retrieves kind/zone at bounds edges', () => {
    const g = new Grid({ width: 16, height: 12 });
    g.setKind(0, 0, TileKind.Road);
    g.setZone(15, 11, ZoneKind.Commercial);
    expect(g.getKind(0, 0)).toBe(TileKind.Road);
    expect(g.getZone(15, 11)).toBe(ZoneKind.Commercial);
    expect(g.inBounds(-1, 0)).toBe(false);
    expect(g.inBounds(16, 0)).toBe(false);
    expect(g.inBounds(15, 11)).toBe(true);
  });

  it('idx/xy round-trip', () => {
    const g = new Grid({ width: 7, height: 5 });
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 7; x++) {
        const i = g.idx(x, y);
        const [rx, ry] = g.xy(i);
        expect([rx, ry]).toEqual([x, y]);
      }
    }
  });

  it('roadNeighbourCount detects adjacent roads', () => {
    const g = new Grid({ width: 5, height: 5 });
    g.setKind(1, 2, TileKind.Road);
    g.setKind(3, 2, TileKind.Road);
    g.setKind(2, 1, TileKind.Road);
    expect(g.roadNeighbourCount(2, 2)).toBe(3);
    expect(g.roadNeighbourCount(0, 0)).toBe(0);
  });
});
