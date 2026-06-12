# Architecture

## Layers

```
+--------------------------+
|  Electron main / preload |   OS integration, file I/O, mod folder access
+------------|-------------+
             |   IPC
+------------v-------------+
|       UI (DOM)           |   HUD, toolbar, save/load dialogs
|       Render (Pixi)      |   camera, tile layer
+------------|-------------+
             |   reads
+------------v-------------+
|     Simulation (pure TS) |   deterministic, no DOM / no Pixi
+------------|-------------+
             |   reads
+------------v-------------+
|  Content + Mods (JSON)   |   validated with Zod at load time
+--------------------------+
```

The sim is a pure, headless TypeScript module. Rendering and input read sim
state and issue commands (`roads.place`, `zoning.paint`, etc.) but never
mutate via private hooks. That contract is enforced in code-review and by the
ESLint rule in `.eslintrc.cjs` which bans DOM/Pixi imports inside `src/sim/`.

## Simulation tick

A `TickDriver` advances the sim at a fixed 10 Hz regardless of render frame
rate, using an accumulator pattern:

```
advance(dtMs):
  accumulator += dtMs * speed
  while accumulator >= stepMs:
    step()
    accumulator -= stepMs
```

`step()` runs systems in a fixed order:

1. `roads.ensureFresh()` — rebuilds the road graph if dirty
2. `buildings.step(N)` — samples N random zoned tiles and grows buildings
3. Clock advance; emits `tick`, `dayChanged`, `monthChanged`
4. `economy.applyMonth()` at each month boundary
5. `milestones.update()` based on current census

System order is load-bearing: milestones must read after growth, economy
must run on month boundaries only, and graph refresh must precede any system
that walks roads.

## State layout

All tile data lives in three parallel typed arrays on `Grid`:

| Array        | Type          | Meaning                             |
| ------------ | ------------- | ----------------------------------- |
| `kind`       | `Uint8Array`  | `TileKind` — ground / water / road |
| `zone`       | `Uint8Array`  | `ZoneKind` — none / R / C / I       |
| `buildingId` | `Uint16Array` | 0 = empty, else building id         |

Buildings live in a `Map<BuildingId, Building>` on the `BuildingSystem`.
Using a map (not an array) keeps deletions O(1) and keeps ids stable across
saves; the grid stores the id to reach the record.

The road graph is a node+edge adjacency list rebuilt lazily when road tiles
change. V1 uses full rebuilds on change; Phase 3 will switch to incremental
updates when traffic AI queries the graph each tick.

## Determinism

- One seeded `Rng` per world. Never `Math.random` inside `src/sim`.
- No `Date.now` inside the sim. All time comes from the tick clock.
- Identical seed + identical input sequence must produce identical city
  states. See `tests/sim/tick.test.ts` for the regression.

## Save format

`src/sim/save.ts` produces a versioned JSON object:

- `schemaVersion` — bump and provide a migration when the layout changes.
- `grid.kind / zone / buildingId` — base64-packed typed arrays.
- `buildings` — plain array (the map's values).
- `rngState` — for deterministic resume.

Loads into a freshly-constructed world of matching size; mismatches throw
rather than silently truncating.

## Mods and content

See [`modding-guide.md`](./modding-guide.md) and
[`content-schema.md`](./content-schema.md).

## Why PixiJS

We render tiles and a few thousand agents at interactive frame rates. Pixi
gives us a batched WebGL renderer (with a Canvas 2D fallback) without
imposing a scene-graph culture. All draw state lives in `src/render/` and is
one-way — pixi never writes back into sim state.

## Phase roadmap

See [`roadmap.md`](./roadmap.md).
