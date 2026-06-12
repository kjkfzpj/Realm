/**
 * Zod schemas for content packs. These are the contract between moddable data
 * and the simulation core. Anything that does not validate here is rejected
 * with a loud log and skipped — we never crash on a bad pack.
 */

import { z } from 'zod';

export const BuildingDefSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('building'),
  zone: z.enum(['residential', 'commercial', 'industrial']),
  density: z.number().int().min(1).max(5),
  size: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  cost: z.number().int().min(0),
  upkeep: z.number().int().min(0),
  needs: z.array(z.enum(['power', 'water', 'waste', 'fire', 'health', 'police'])).default([]),
  provides: z
    .object({
      housing: z.number().int().min(0).optional(),
      jobs: z.number().int().min(0).optional(),
    })
    .default({}),
  sprite: z.string().min(1),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .default('#888888'),
  tags: z.array(z.string()).default([]),
});
export type BuildingDef = z.infer<typeof BuildingDefSchema>;

export const ZoneDefSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('zone'),
  zone: z.enum(['residential', 'commercial', 'industrial']),
  label: z.string().min(1),
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  allows: z.array(z.string()).default([]),
});
export type ZoneDef = z.infer<typeof ZoneDefSchema>;

export const BalanceSchema = z.object({
  economy: z.object({
    startingTreasury: z.number().int(),
    roadUpkeepPerTile: z.number().int().min(0),
    taxRateResidential: z.number().min(0),
    taxRateCommercial: z.number().min(0),
    taxRateIndustrial: z.number().min(0),
    roadCostPerTile: z.number().int().min(0),
  }),
  milestones: z.object({
    tierPopulationThresholds: z.array(z.number().int().min(0)).length(5),
  }),
  growth: z.object({
    samplesPerTick: z.number().int().min(1),
  }),
});
export type BalanceConfig = z.infer<typeof BalanceSchema>;

export const ManifestSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  loadOrder: z.number().int().default(0),
  requires: z.array(z.string()).default([]),
  entries: z.object({
    zones: z.array(z.string()).default([]),
    buildings: z.array(z.string()).default([]),
    balance: z.string().optional(),
  }),
});
export type PackManifest = z.infer<typeof ManifestSchema>;
