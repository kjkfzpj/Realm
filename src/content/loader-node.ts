/**
 * Node-side content loader used by the headless sim and Vitest. Reads packs
 * from disk. Never imported from browser code — the bundler must not see
 * `node:fs` from the renderer entry.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ContentRegistry } from './registry.js';
import { ingestPack, loadOrderOf, LogFn, RawPack } from './loader-core.js';

export async function loadContentNode(
  registry: ContentRegistry,
  opts: { contentDir: string; modsDir?: string },
  log: LogFn,
): Promise<void> {
  async function readPackFolder(packDir: string): Promise<RawPack | null> {
    const id = packDir.split(/[/\\]/).pop() ?? '';
    const manifestPath = join(packDir, 'manifest.json');
    let manifest: unknown;
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch {
      return null;
    }
    async function readJsonDir(sub: string): Promise<unknown[]> {
      try {
        const entries = await readdir(join(packDir, sub));
        const out: unknown[] = [];
        for (const e of entries) {
          if (!e.endsWith('.json')) continue;
          out.push(JSON.parse(await readFile(join(packDir, sub, e), 'utf8')));
        }
        return out;
      } catch {
        return [];
      }
    }
    const zones = await readJsonDir('zones');
    const buildings = await readJsonDir('buildings');
    let balance: unknown;
    try {
      balance = JSON.parse(await readFile(join(packDir, 'balance.json'), 'utf8'));
    } catch {
      balance = undefined;
    }
    return { id, files: { manifest, zones, buildings, balance } };
  }

  async function listSubdirs(root: string): Promise<string[]> {
    try {
      const entries = await readdir(root, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => join(root, e.name));
    } catch {
      return [];
    }
  }

  const packs: RawPack[] = [];
  for (const d of await listSubdirs(opts.contentDir)) {
    const p = await readPackFolder(d);
    if (p) packs.push(p);
  }
  if (opts.modsDir) {
    for (const d of await listSubdirs(opts.modsDir)) {
      const p = await readPackFolder(d);
      if (p) packs.push(p);
    }
  }
  packs.sort((a, b) => loadOrderOf(a) - loadOrderOf(b));
  for (const p of packs) ingestPack(registry, p, log);
  if (!registry.balance) {
    throw new Error('[content] No balance.json loaded. Core pack missing?');
  }
}
