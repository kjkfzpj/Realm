# Roadmap

## Phase 1 — Playable slice (done)

- Pixi bootstrap, camera pan/zoom, tile grid, build toolbar
- Road placement + bulldoze, zone painting (R/C/I)
- 10 Hz simulation tick with building growth
- Monthly taxation + upkeep, milestone tiers
- Deterministic RNG; headless sim runner and Vitest suites
- Content registry with Zod validation, core content pack, example mod
- Electron wiring (dev), Windows NSIS config (not yet executed)

## Phase 2 — Services and persistence

- Power and water production/consumption with graph propagation
- Coverage overlays (toggleable heatmap layers)
- Building level-up gated on full service coverage + road access
- Save/load dialogs wired through Electron preload bridge
- Settings menu (graphics, audio, keybinds)
- Package and smoke-test `CityBuilder-Setup-0.1.x.exe`

## Phase 3 — Agents and services II

- Pooled citizen + vehicle agents, A* on the road graph
- Traffic congestion affecting service effectiveness
- Waste, fire, and health coverage radii
- Police (optional), desirability / land value pass
- Demand model with feedback: satisfied needs raise demand; unemployment drops it

## Phase 4 — Mods and polish

- Mod hooks wired to `src/mods/api.ts` (`onTick`, `onBuildingPlaced`, ...)
- Balance rebalance based on playtesting
- Audio placeholders (loop, UI clicks) — originally produced, not sampled
- Windows installer CI, optional GitHub release
- Documentation pass: `content-schema.md` expanded with service authoring

## Stretch (after V1)

- Medium-density zones
- Trams / public transit
- Terrain editing
- Seasons
- Photo/share screenshot capture
- Multiplayer is **explicitly out of scope** for V1-V2
