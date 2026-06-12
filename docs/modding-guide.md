# Modding guide

## Folder layout

A mod is any folder containing a `manifest.json`:

```
mods/
  my-mod/
    manifest.json
    zones/...
    buildings/...
    balance.json
```

During development the loader scans `./mods/` at the project root. In a
packaged Windows install, the loader scans
`%APPDATA%/CityBuilder/mods/` (Electron `userData/mods`) as well.

## What you can already mod (Phase 1)

- **Buildings** — any number, grouped by residential / commercial / industrial.
- **Zones** — visual label and colour; zone kinds remain R/C/I.
- **Balance** — starting treasury, tax rates, milestone thresholds, growth rate.

## What is coming

Phase 2 adds:

- **Utilities** and their production/consumption — modders define new services
- **Disasters** — scripted events fired from mod hooks
- **UI feature flags** — toggle optional panels

Phase 4 adds:

- **Script hooks** — `onTick`, `onBuildingPlaced`, `onZonePainted` (surface
  already defined in `src/mods/api.ts`; wiring lands in Phase 4)
- **Maps** — custom starting terrain

## Load order

Mods are loaded after the core pack, sorted by `loadOrder` ascending. If two
mods define the same entry `id`, the later one wins.

## Example: a denser dwelling

```json
// mods/my-mod/manifest.json
{
  "id": "my-mod",
  "version": "0.1.0",
  "name": "Dense Dwellings",
  "description": "Adds a higher-yield residence.",
  "loadOrder": 10,
  "requires": ["core"],
  "entries": { "zones": [], "buildings": ["stately_dwelling"] }
}
```

```json
// mods/my-mod/buildings/stately_dwelling.json
{
  "id": "my-mod.stately_dwelling",
  "kind": "building",
  "zone": "residential",
  "density": 2,
  "size": [1, 1],
  "cost": 160,
  "upkeep": 3,
  "needs": ["power", "water"],
  "provides": { "housing": 16 },
  "sprite": "res_stately",
  "color": "#a9d5b9",
  "tags": ["low_density"]
}
```

The game picks this up on next launch. Invalid JSON or schema failures are
logged — open DevTools (`F12` in dev) or check the log panel in-game.

## Requesting new mods from Claude

When asking for future changes, reference files by path and describe the
behaviour precisely. For example:

> Add a `core.school` building, zone residential, cost 400, provides 30
> jobs, needs power+water, and increase `taxRateResidential` slightly in
> `content/core/balance.json`. Add a Vitest asserting population-per-school
> is counted correctly.

That level of specificity lets the assistant make a surgical change.
