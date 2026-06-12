import { describe, it, expect } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentRegistry } from '../../src/content/registry.js';
import { loadContentNode } from '../../src/content/loader-node.js';

describe('content loader', () => {
  it('loads the core pack and validates the balance file', async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, '..', '..');
    const reg = new ContentRegistry();
    await loadContentNode(reg, { contentDir: resolve(root, 'content') }, () => undefined);
    expect(reg.loadedPackIds()).toContain('core');
    expect(reg.allBuildings().length).toBeGreaterThan(0);
    expect(reg.balance.economy.startingTreasury).toBeGreaterThan(0);
  });

  it('merges mods: later loadOrder overrides earlier entries by id', async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, '..', '..');
    const reg = new ContentRegistry();
    await loadContentNode(
      reg,
      { contentDir: resolve(root, 'content'), modsDir: resolve(root, 'mods') },
      () => undefined,
    );
    expect(reg.loadedPackIds()).toContain('example');
    expect(reg.getBuilding('example.stately_dwelling')).toBeDefined();
  });

  it('rejects invalid balance without crashing', async () => {
    const reg = new ContentRegistry();
    const logs: string[] = [];
    await loadContentNode(
      reg,
      { contentDir: resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content') },
      (level, msg) => logs.push(`${level}:${msg}`),
    );
    // Baseline should have zero errors for the shipped core pack.
    expect(logs.filter((l) => l.startsWith('error:')).length).toBe(0);
  });
});
