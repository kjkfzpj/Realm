/**
 * Minimal typed pub/sub bus. Used by UI and mods to observe sim changes.
 * Kept intentionally small — no priorities, no async — to stay deterministic.
 */

export type Listener<T> = (payload: T) => void;

export class EventBus<EventMap> {
  private readonly listeners = new Map<keyof EventMap, Set<Listener<any>>>();



  on<K extends keyof EventMap>(key: K, fn: Listener<EventMap[K]>): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof EventMap>(key: K, payload: EventMap[K]): void {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        // Never let a listener crash the sim loop.
        // eslint-disable-next-line no-console
        console.error(`[events] listener for "${String(key)}" threw:`, err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export interface SimEvents {
  tick: { tick: number };
  dayChanged: { day: number; month: number; year: number };
  monthChanged: { month: number; year: number };
  roadPlaced: { tile: number };
  roadRemoved: { tile: number };
  zonePainted: { tile: number; zone: number };
  buildingPlaced: { buildingId: number; defId: string; tile: number };
  buildingRemoved: { buildingId: number };
  tierChanged: { tier: number };
  logMessage: { level: 'info' | 'warn' | 'error'; text: string };
}
