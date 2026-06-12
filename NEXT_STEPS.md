# Next steps

## Phase 2 (next up)

1. **Utilities — power and water.** Add `PowerGrid` / `WaterGrid` systems in
   `src/sim/utilities.ts`. Producer buildings (power plant, water tower) add
   nodes; coverage propagates through roads and adjacent tiles. Building
   growth gates on `needs` vs provided services.
2. **Coverage overlays.** A `src/render/overlay.ts` layer toggled with `F1–F4`
   tints tiles by service coverage / zone type / desirability.
3. **Main menu, new-game, save-load UI.** Wire `window.city.saveDialog()` and
   `loadDialog()` from preload. Main menu before game boot.
4. **Settings menu.** Graphics (resolution, vsync), audio volume, keybinds.
5. **Packaging smoke test.** Run `npm run package:win` on a Windows VM.

## Phase 3

1. Pooled agents (vehicles + citizens) with A* on the road graph.
2. Waste, fire, health services.
3. Demand model feedback loop.

## Phase 4

1. Mod script hooks on the event bus.
2. Audio placeholders (original loops and UI clicks).
3. Windows installer CI via GitHub Actions.

## Requests I can take right now

Small, surgical changes that fit the current architecture:

- "Add a medium-density dwelling that requires power and water."
- "Rebalance tax rates so industrial pays 4 and commercial pays 2."
- "Add a `tierChanged` toast in the HUD."
- "Expand the map to 128×128."
- "Add a fire station building (no behaviour yet, just placement)."

Larger changes (traffic AI, agent simulation, disaster system) are Phase 3
and benefit from a dedicated design pass first.
