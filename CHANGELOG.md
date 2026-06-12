# Changelog

## 0.1.0 — Phase 1 playable slice

- Initial scaffold: TypeScript + Vite + PixiJS + Electron + Vitest
- Pure-TS simulation core (grid, roads, zoning, tick, buildings, economy,
  milestones, RNG, save) with a lint rule banning DOM / Pixi imports
- Content registry loading `content/core` JSON via Zod-validated schemas
- DOM HUD + build toolbar; Pixi-based top-down tile renderer
- Mouse + keyboard input; drag painting for roads and zones
- Headless sim runner (`npm run sim`) and Vitest suites
- Electron dev wiring; Windows NSIS packaging config
- Example mod demonstrating override-by-id loading
- Documentation: architecture, content schema, modding guide, originality,
  roadmap, packaging
