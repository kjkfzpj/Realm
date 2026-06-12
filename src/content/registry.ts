/**
 * Content registry: the in-memory catalogue of every content entry the sim
 * can reference. All lookups go through here. Mods contribute to this registry
 * via the loader.
 */

import {
  BalanceConfig,
  BuildingDef as BuildingDefT,
  PackManifest,
  ZoneDef,
} from './validate.js';
import { ZoneKind } from '../sim/types.js';

export type BuildingDef = BuildingDefT;

export class ContentRegistry {
  private _packs: PackManifest[] = [];
  private _zones = new Map<string, ZoneDef>();
  private _buildings = new Map<string, BuildingDef>();
  private _buildingsByZone = new Map<string, BuildingDef[]>();
  balance!: BalanceConfig;

  addPack(manifest: PackManifest): void {
    this._packs.push(manifest);
  }

  addZone(z: ZoneDef): void {
    this._zones.set(z.id, z);
  }

  addBuilding(b: BuildingDef): void {
    this._buildings.set(b.id, b);
    let arr = this._buildingsByZone.get(b.zone);
    if (!arr) {
      arr = [];
      this._buildingsByZone.set(b.zone, arr);
    }
    // If this id already exists from an earlier pack, replace it in the array.
    const existing = arr.findIndex((x) => x.id === b.id);
    if (existing >= 0) arr[existing] = b;
    else arr.push(b);
  }

  setBalance(b: BalanceConfig): void {
    this.balance = b;
  }

  getZone(id: string): ZoneDef | undefined {
    return this._zones.get(id);
  }

  getBuilding(id: string): BuildingDef | undefined {
    return this._buildings.get(id);
  }

  buildingsByZone(zone: ZoneKind): BuildingDef[] {
    const key =
      zone === ZoneKind.Residential
        ? 'residential'
        : zone === ZoneKind.Commercial
          ? 'commercial'
          : zone === ZoneKind.Industrial
            ? 'industrial'
            : '';
    return this._buildingsByZone.get(key) ?? [];
  }

  allBuildings(): BuildingDef[] {
    return [...this._buildings.values()];
  }

  allZones(): ZoneDef[] {
    return [...this._zones.values()];
  }

  loadedPackIds(): string[] {
    return this._packs.map((p) => p.id);
  }
}
