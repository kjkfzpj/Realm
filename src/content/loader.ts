/**
 * Browser-side content loader. Uses Vite's glob imports to pull every JSON in
 * `content/<pack>/` into the bundle at build time. Node-only IO is
 * intentionally not in this file so the renderer bundle never references
 * `node:fs` — see `loader-node.ts` for the headless/test path.
 */

import { ContentRegistry } from './registry.js';
import { ingestPack, loadOrderOf, LogFn, RawPack } from './loader-core.js';

export async function loadContentBrowser(registry: ContentRegistry, log: LogFn): Promise<void> {
  const manifests = import.meta.glob('/content/*/manifest.json', {
    eager: true,
    import: 'default',
  }) as Record<string, unknown>;
  const zones = import.meta.glob('/content/*/zones/*.json', {
    eager: true,
    import: 'default',
  }) as Record<string, unknown>;
  const buildings = import.meta.glob('/content/*/buildings/*.json', {
    eager: true,
    import: 'default',
  }) as Record<string, unknown>;
  const balances = import.meta.glob('/content/*/balance.json', {
    eager: true,
    import: 'default',
  }) as Record<string, unknown>;

  const packIds = new Set<string>();
  for (const path of Object.keys(manifests)) {
    const m = path.match(/^\/content\/([^/]+)\/manifest\.json$/);
    if (m) packIds.add(m[1]);
  }

  const packs: RawPack[] = [];
  for (const id of packIds) {
    const manifest = manifests[`/content/${id}/manifest.json`];
    const zs = pickPrefixed(zones, `/content/${id}/zones/`);
    const bs = pickPrefixed(buildings, `/content/${id}/buildings/`);
    const bal = balances[`/content/${id}/balance.json`];
    packs.push({ id, files: { manifest, zones: zs, buildings: bs, balance: bal } });
  }

  packs.sort((a, b) => loadOrderOf(a) - loadOrderOf(b));
  for (const p of packs) ingestPack(registry, p, log);

  if (!registry.balance) {
    throw new Error('[content] No balance.json loaded. Core pack missing?');
  }
}

function pickPrefixed(map: Record<string, unknown>, prefix: string): unknown[] {
  const out: unknown[] = [];
  for (const [k, v] of Object.entries(map)) if (k.startsWith(prefix)) out.push(v);
  return out;
}

export type { LogFn };
