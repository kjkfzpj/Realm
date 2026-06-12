/**
 * Runtime-agnostic ingestion logic. Both the browser loader and the Node
 * loader feed `RawPack` objects through `ingestPack`, which owns all Zod
 * validation and registry population. This keeps the two environment-
 * specific loaders tiny.
 */

import {
  BalanceSchema,
  BuildingDefSchema,
  ManifestSchema,
  ZoneDefSchema,
  PackManifest,
} from './validate.js';
import { ContentRegistry } from './registry.js';

export interface RawPackFiles {
  manifest: unknown;
  zones: unknown[];
  buildings: unknown[];
  balance?: unknown;
}

export interface RawPack {
  id: string;
  files: RawPackFiles;
}

export type LogFn = (level: 'warn' | 'error', msg: string) => void;

export function ingestPack(
  registry: ContentRegistry,
  raw: RawPack,
  log: LogFn,
): PackManifest | null {
  const manifestP = ManifestSchema.safeParse(raw.files.manifest);
  if (!manifestP.success) {
    log('error', `[content] invalid manifest in pack "${raw.id}": ${manifestP.error.message}`);
    return null;
  }
  const manifest = manifestP.data;
  registry.addPack(manifest);

  for (const z of raw.files.zones) {
    const p = ZoneDefSchema.safeParse(z);
    if (!p.success) {
      log('warn', `[content] ${manifest.id}: invalid zone entry skipped: ${p.error.message}`);
      continue;
    }
    registry.addZone(p.data);
  }
  for (const b of raw.files.buildings) {
    const p = BuildingDefSchema.safeParse(b);
    if (!p.success) {
      log('warn', `[content] ${manifest.id}: invalid building skipped: ${p.error.message}`);
      continue;
    }
    registry.addBuilding(p.data);
  }
  if (raw.files.balance) {
    const p = BalanceSchema.safeParse(raw.files.balance);
    if (!p.success) {
      log('error', `[content] ${manifest.id}: invalid balance rejected: ${p.error.message}`);
    } else {
      registry.setBalance(p.data);
    }
  }
  return manifest;
}

export function loadOrderOf(p: RawPack): number {
  const m = p.files.manifest as { loadOrder?: number } | undefined;
  return m?.loadOrder ?? 0;
}
