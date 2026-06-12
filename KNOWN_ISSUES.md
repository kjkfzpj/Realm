# Known issues (V1)

## Gameplay

- Buildings grow whenever a zoned tile has road access; utilities are not yet
  gated on power/water (Phase 2).
- There is no traffic simulation yet; vehicle agents land in Phase 3.
- The demand model is fixed-weight in V1 (no feedback from unsatisfied needs).
- Bulldozing a road under a developed tile does not abandon the building
  (Phase 2 adds abandonment).
- Save / load exists as a library; the UI dialog wiring lands in Phase 2.

## UX

- Mouse-wheel zoom does not animate; it snaps.
- Log panel is informational only and cannot be filtered or cleared.
- Settings menu is not wired yet (Phase 2).
- Main menu and new-game screen are not built — the game boots straight into
  a fixed seed. Phase 2 adds a proper menu.

## Technical

- The road graph rebuilds fully on edit (not incremental). Fine for V1 city
  sizes; will need incremental updates when traffic AI runs every tick.
- Electron packaging is configured but the installer is not produced during
  `npm test` — needs `npm run package:win` manually.
- The Windows installer is unsigned; first launch shows a SmartScreen warning.
- Assets are coloured rectangles; we have no sprite atlas yet.

## Headless dev environment

- Vitest runs in Node; the PixiJS render layer is not exercised by tests.
  Visual regressions can only be caught on a machine with a display.
- `npm run dev` requires an X display (or Electron's `--disable-gpu` with
  Xvfb). On a headless CI, prefer `npm run dev:web` + Playwright.
