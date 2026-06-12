# Content schema

Every content pack is a folder containing:

```
<pack>/
  manifest.json
  zones/*.json          # optional
  buildings/*.json      # optional
  balance.json          # optional
```

All files are validated with Zod (`src/content/validate.ts`). Invalid entries
are logged and **skipped** — they never crash the game.

## `manifest.json`

```json
{
  "id": "core",
  "version": "0.1.0",
  "name": "Core Content",
  "description": "Base content pack.",
  "loadOrder": 0,
  "requires": [],
  "entries": {
    "zones": ["dwellings", "trade", "works"],
    "buildings": ["cottage", "rowhouse", "corner_shop"],
    "balance": "balance.json"
  }
}
```

`loadOrder` decides merge order: lower numbers load first, later entries
override earlier ones by `id`.

## `zones/<name>.json`

```json
{
  "id": "core.dwellings",
  "kind": "zone",
  "zone": "residential",
  "label": "Dwellings",
  "color": "#4f8a6b",
  "allows": ["core.cottage", "core.rowhouse"]
}
```

`zone` must be one of `residential`, `commercial`, `industrial`. `label` and
`color` are surfaced in the UI.

## `buildings/<name>.json`

```json
{
  "id": "core.cottage",
  "kind": "building",
  "zone": "residential",
  "density": 1,
  "size": [1, 1],
  "cost": 40,
  "upkeep": 1,
  "needs": [],
  "provides": { "housing": 4 },
  "sprite": "res_cottage",
  "color": "#6fae87",
  "tags": ["low_density"]
}
```

| Field      | Meaning                                                       |
| ---------- | ------------------------------------------------------------- |
| `zone`     | Which zone this building grows in                             |
| `density`  | 1..5 — higher density spawns later (Phase 2 enforces)         |
| `size`     | `[w, h]` in tiles (V1 ignores non-1x1 sizes; Phase 2 adds)    |
| `cost`     | Deducted from treasury when placed                            |
| `upkeep`   | Charged monthly                                               |
| `needs`    | Services required (Phase 2+: power, water, waste, fire, ...) |
| `provides` | `housing` adds population, `jobs` adds jobs                   |
| `color`    | Fill colour used by the placeholder renderer                  |

## `balance.json`

```json
{
  "economy": {
    "startingTreasury": 5000,
    "roadUpkeepPerTile": 1,
    "taxRateResidential": 2,
    "taxRateCommercial": 3,
    "taxRateIndustrial": 3,
    "roadCostPerTile": 5
  },
  "milestones": {
    "tierPopulationThresholds": [0, 50, 250, 1000, 5000]
  },
  "growth": {
    "samplesPerTick": 48
  }
}
```

A mod whose `loadOrder` is higher than the core pack can ship a partial
`balance.json` to rebalance a game. The final winner wins across the entire
balance object (we do not deep-merge individual numbers — ship a full file).
