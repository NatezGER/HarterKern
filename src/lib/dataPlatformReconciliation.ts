import type { DataPlatformSnapshot } from "@/services/dataPlatformRepository";

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const unique = new Map<string, T>();
  items.forEach((item) => unique.set(key(item), item));
  return [...unique.values()];
}

/**
 * A remote load is authoritative. Reconciliation intentionally does not merge
 * the previous browser state back into the Supabase snapshot.
 */
export function reconcileDataPlatformSnapshot(
  _previous: DataPlatformSnapshot,
  remote: DataPlatformSnapshot,
): DataPlatformSnapshot {
  return {
    publicData: {
      players: uniqueBy(remote.publicData.players, ({ id }) => id),
      leaderboard: uniqueBy(remote.publicData.leaderboard, ({ playerId }) => playerId),
      dailyWinners: uniqueBy(remote.publicData.dailyWinners, ({ id }) => id),
      worldRecordHistory: uniqueBy(remote.publicData.worldRecordHistory, ({ id }) => id),
      events: uniqueBy(remote.publicData.events, ({ id }) => id),
      statistics: uniqueBy(remote.publicData.statistics, ({ id }) => id),
      recentAttempts: uniqueBy(remote.publicData.recentAttempts, ({ id }) => id),
    },
    liveState: {
      version: 2,
      players: uniqueBy(remote.liveState.players, ({ id }) => id),
      events: uniqueBy(remote.liveState.events, ({ id }) => id),
      attempts: uniqueBy(remote.liveState.attempts, ({ id }) => id),
      historicalAttempts: uniqueBy(remote.liveState.historicalAttempts, ({ id }) => id),
    },
  };
}
