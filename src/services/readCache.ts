/** Short-lived read-through cache. Invalidations during a read are serialized:
 * consumers keep the same promise, but receive a fresh post-invalidation result. */
export const READ_STALE_MS = 20_000;
interface Entry<T> {
  generation: number;
  promise?: Promise<T>;
  value?: T;
  succeededAt?: number;
  startedAt?: number;
  loader?: () => Promise<T>;
  consumers?: Set<AbortSignal | undefined>;
}
export class ReadCache<T> {
  private entries = new Map<string, Entry<T>>();

  read(key: string, loader: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const entry = this.entries.get(key) ?? { generation: 0 };
    this.entries.set(key, entry);
    entry.loader = loader;
    if (entry.promise) {
      entry.consumers?.add(signal);
      return entry.promise;
    }
    if (entry.succeededAt != null && Date.now() - entry.succeededAt < READ_STALE_MS) {
      return Promise.resolve(entry.value as T);
    }
    entry.consumers = new Set([signal]);
    const hasConsumer = () => [...entry.consumers!].some((consumer) => !consumer?.aborted);
    const run = async () => {
      for (;;) {
        const generation = entry.generation;
        entry.startedAt = Date.now();
        const currentLoader = entry.loader!;
        let value: T;
        try {
          value = await currentLoader();
        } catch (error) {
          if (generation !== entry.generation && hasConsumer()) continue;
          // A newly mounted consumer can replace a cancelled route's loader.
          if (currentLoader !== entry.loader && error instanceof Error && error.name === "AbortError") continue;
          throw error;
        }
        if (generation !== entry.generation) {
          if (hasConsumer()) continue;
          // The old consumer ignores this value. Keep it out of the success
          // cache and do not start a background read after route cleanup.
          return value;
        }
        entry.value = value;
        entry.succeededAt = Date.now();
        return value;
      }
    };
    const promise = run().finally(() => { entry.promise = undefined; entry.consumers?.clear(); });
    entry.promise = promise;
    return promise;
  }

  invalidate(matches: (key: string) => boolean = () => true) {
    for (const [key, entry] of this.entries) if (matches(key)) {
      entry.generation++;
      entry.succeededAt = undefined;
      entry.value = undefined;
    }
  }

  shouldRefresh(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return true;
    if (entry.promise) return false;
    if (entry.succeededAt != null) return Date.now() - entry.succeededAt >= READ_STALE_MS;
    // Failed reads must not turn alternating focus/visibility events into a storm.
    return entry.startedAt == null || Date.now() - entry.startedAt >= 5_000;
  }
}

export function statisticReadKey(source: string, season: string | number, eventId?: string, playerIds?: (string | null)[]) {
  return JSON.stringify([source, season, eventId ?? null,
    playerIds ? [...new Set(playerIds.filter((id): id is string => id != null))].sort() : null]);
}
