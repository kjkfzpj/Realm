import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/sim/grid.js';
import { RoadGraph } from '../../src/sim/roads.js';
import { TileKind } from '../../src/sim/types.js';

describe('RoadGraph', () => {
  it('places a road on empty ground and refuses duplicates', () => {
    const g = new Grid({ width: 8, height: 8 });
    const r = new RoadGraph(g);
    expect(r.place(3, 3)).toBe(true);
    expect(g.getKind(3, 3)).toBe(TileKind.Road);
    expect(r.place(3, 3)).toBe(false);
  });

  it('builds nodes at dead-ends and intersections but not mid-run', () => {
    const g = new Grid({ width: 10, height: 10 });
    const r = new RoadGraph(g);
    // Straight horizontal run from (1,5) to (6,5).
    for (let x = 1; x <= 6; x++) r.place(x, 5);
    r.ensureFresh();
    // Expect exactly two nodes (the endpoints) and one edge between them.
    expect(r.nodes.length).toBe(2);
    expect(r.edges.length).toBe(1);
    expect(r.edges[0].length).toBeGreaterThanOrEqual(4);
  });

  it('a T-intersection has three nodes', () => {
    const g = new Grid({ width: 10, height: 10 });
    const r = new RoadGraph(g);
    for (let x = 1; x <= 7; x++) r.place(x, 5);
    for (let y = 1; y <= 5; y++) r.place(4, y);
    r.ensureFresh();
    // Three endpoints (x=1,y=5), (x=7,y=5), (x=4,y=1) plus one intersection at (4,5) = 4 nodes total.
    expect(r.nodes.length).toBe(4);
  });

  it('remove reverts to ground and marks the graph dirty', () => {
    const g = new Grid({ width: 6, height: 6 });
    const r = new RoadGraph(g);
    r.place(2, 2);
    r.ensureFresh();
    expect(r.remove(2, 2)).toBe(true);
    expect(g.getKind(2, 2)).toBe(TileKind.Ground);
    expect(r.dirty).toBe(true);
  });

  it('tileNearRoad finds adjacency inside range', () => {
    const g = new Grid({ width: 6, height: 6 });
    const r = new RoadGraph(g);
    r.place(3, 3);
    expect(r.tileNearRoad(2, 3, 1)).toBe(true);
    expect(r.tileNearRoad(1, 1, 1)).toBe(false);
    expect(r.tileNearRoad(1, 1, 3)).toBe(true);
  });
});
