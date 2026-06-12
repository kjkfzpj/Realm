/**
 * Road placement and graph maintenance.
 *
 * The road graph is rebuilt lazily from the grid whenever road tiles change.
 * For V1 this is simple and correct; Phase 3 will move to incremental updates
 * when traffic AI starts querying the graph every tick.
 *
 * Graph model:
 *   - A node is placed on any road tile whose road-neighbour count != 2
 *     (intersections and dead-ends). Straight runs have no node mid-segment.
 *   - Each edge records the ordered list of road tiles it traverses and its
 *     tile-length. Neighbour edges store back-refs on each node.
 */

import { Grid } from './grid.js';
import { EventBus, SimEvents } from './events.js';
import { RoadEdge, RoadNode, TileKind } from './types.js';

export class RoadGraph {
  nodes: RoadNode[] = [];
  edges: RoadEdge[] = [];
  /** For each road tile, the edge id it belongs to, or -1 if none. */
  tileEdge: Int32Array;
  /** True when graph state does not match the grid. */
  dirty = true;

  constructor(private grid: Grid) {
    this.tileEdge = new Int32Array(grid.width * grid.height).fill(-1);
  }

  markDirty(): void {
    this.dirty = true;
  }

  ensureFresh(): void {
    if (this.dirty) this.rebuild();
  }

  place(x: number, y: number, bus?: EventBus<SimEvents>): boolean {
    if (!this.grid.inBounds(x, y)) return false;
    if (this.grid.getKind(x, y) === TileKind.Road) return false;
    if (this.grid.getKind(x, y) !== TileKind.Ground) return false;
    if (this.grid.getZone(x, y) !== 0) return false;
    this.grid.setKind(x, y, TileKind.Road);
    this.markDirty();
    bus?.emit('roadPlaced', { tile: this.grid.idx(x, y) });
    return true;
  }

  remove(x: number, y: number, bus?: EventBus<SimEvents>): boolean {
    if (!this.grid.inBounds(x, y)) return false;
    if (this.grid.getKind(x, y) !== TileKind.Road) return false;
    this.grid.setKind(x, y, TileKind.Ground);
    this.markDirty();
    bus?.emit('roadRemoved', { tile: this.grid.idx(x, y) });
    return true;
  }

  /** Count of road-kind orthogonal neighbours at (x, y). */
  private roadDegree(x: number, y: number): number {
    return this.grid.roadNeighbourCount(x, y);
  }

  /**
   * Rebuild nodes + edges from scratch. O(road tiles). Called lazily.
   * Algorithm:
   *   1. Mark every road tile with deg != 2 as a node.
   *   2. Walk each unvisited run between two nodes, create an edge.
   *   3. Isolated road tiles become self-loop nodes with no edges.
   */
  private rebuild(): void {
    const { grid } = this;
    const n = grid.width * grid.height;
    this.nodes = [];
    this.edges = [];
    this.tileEdge = new Int32Array(n).fill(-1);

    const nodeAtTile = new Int32Array(n).fill(-1);
    // Pass 1: nodes.
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.getKind(x, y) !== TileKind.Road) continue;
        const deg = this.roadDegree(x, y);
        if (deg !== 2) {
          const id = this.nodes.length;
          this.nodes.push({ id, tile: grid.idx(x, y), edges: [] });
          nodeAtTile[grid.idx(x, y)] = id;
        }
      }
    }

    // Pass 2: walk edges from each node along unvisited road neighbours.
    for (const node of this.nodes) {
      const [nx, ny] = grid.xy(node.tile);
      for (const [ax, ay] of grid.neighbours4(nx, ny)) {
        if (grid.getKind(ax, ay) !== TileKind.Road) continue;
        const startTile = grid.idx(ax, ay);
        if (this.tileEdge[startTile] !== -1) continue;
        // If neighbour is itself a node (deg != 2), create a 1-tile edge.
        const edgeId = this.edges.length;
        const tiles: number[] = [startTile];
        this.tileEdge[startTile] = edgeId;

        let prev: [number, number] = [nx, ny];
        let cur: [number, number] = [ax, ay];
        while (nodeAtTile[grid.idx(cur[0], cur[1])] === -1) {
          let next: [number, number] | null = null;
          for (const [tx, ty] of grid.neighbours4(cur[0], cur[1])) {
            if (tx === prev[0] && ty === prev[1]) continue;
            if (grid.getKind(tx, ty) !== TileKind.Road) continue;
            next = [tx, ty];
            break;
          }
          if (!next) break;
          prev = cur;
          cur = next;
          const t = grid.idx(cur[0], cur[1]);
          if (this.tileEdge[t] !== -1) break;
          tiles.push(t);
          this.tileEdge[t] = edgeId;
        }
        const endNode = nodeAtTile[grid.idx(cur[0], cur[1])];
        const edge: RoadEdge = {
          id: edgeId,
          a: node.id,
          b: endNode === -1 ? node.id : endNode,
          tiles,
          length: tiles.length,
        };
        this.edges.push(edge);
        node.edges.push(edgeId);
        if (endNode !== -1 && endNode !== node.id) {
          this.nodes[endNode].edges.push(edgeId);
        }
      }
    }

    this.dirty = false;
  }

  /**
   * True if (x, y) is within `range` tiles (Chebyshev) of any road tile.
   * Used for zone access checks and service coverage seeding.
   */
  tileNearRoad(x: number, y: number, range = 1): boolean {
    const g = this.grid;
    const x0 = Math.max(0, x - range);
    const x1 = Math.min(g.width - 1, x + range);
    const y0 = Math.max(0, y - range);
    const y1 = Math.min(g.height - 1, y + range);
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        if (g.getKind(xx, yy) === TileKind.Road) return true;
      }
    }
    return false;
  }
}
