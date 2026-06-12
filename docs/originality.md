# Originality checklist

This project is our own design. It is not a port, clone, or reverse-engineer
of any commercial city-building game. The rules below codify that.

## Hard rules

1. **No franchise names.** Do not name tiers, advisors, disasters, districts,
   buildings, services, or features after any commercial game's equivalents.
2. **No borrowed UI.** Do not reproduce any commercial game's toolbar layout,
   icon set, panel arrangement, or colour scheme.
3. **No transcribed balance.** Do not copy numbers from any game's wiki,
   official guide, or datamined files. Author fresh numbers.
4. **No ripped assets.** Sprites, sounds, and fonts must be original
   placeholders or licenced for redistribution.
5. **Generic genre features only.** Any new feature must be describable as
   "a common city-sim mechanic" (roads, zones, utilities, pathfinding,
   milestones) rather than "like game X does Y".

## Soft rules

- **Terminology:** we use **Dwellings / Trade / Works** for the three base
  zones. Internal field names (`residential`, `commercial`, `industrial`)
  are neutral descriptors, not franchise branding.
- **Tiers:** our tier names are **Outpost → Hamlet → Town → Borough →
  Metropolis**. These are common English words, not any franchise's sequence.
- **Advisors / messages:** no named NPC advisor character. Log messages are
  plain text from "the Planner's office" style, not characters.
- **Disasters:** if we add them, use generic nouns (fire, flood, quake) and
  original flavour text. No named disasters.

## Review gate

Before merging a PR that adds content or UI, the author runs through this
checklist:

- [ ] New names are generic English or our own coinages
- [ ] New UI does not mimic a specific commercial game's layout
- [ ] New balance numbers were authored, not transcribed
- [ ] New assets are original or licenced

If any box is unchecked, redesign the element.
