import { parseMigratableLiveEventState } from "@/lib/liveEventPersistence";
import {
  createRemoteAttempt,
  importClosedRemoteEvent,
  startRemoteEvent,
  upsertCanonicalPlayer,
} from "@/services/dataPlatformRepository";
import type { LiveEventState } from "@/types/liveEvent";

const sourceKeys = ["harter-kern-live-event-v2", "harter-kern-live-event-v1"];
const markerKey = "harter-kern-pr6a-supabase-migrated";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface MigrationStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface MigrationDependencies {
  storage: MigrationStorage;
  upsertPlayer: typeof upsertCanonicalPlayer;
  startEvent: typeof startRemoteEvent;
  importClosedEvent: typeof importClosedRemoteEvent;
  createAttempt: typeof createRemoteAttempt;
  randomUuid: () => string;
  now: () => string;
}

const productionDependencies = (): MigrationDependencies => ({
  storage: localStorage,
  upsertPlayer: upsertCanonicalPlayer,
  startEvent: startRemoteEvent,
  importClosedEvent: importClosedRemoteEvent,
  createAttempt: createRemoteAttempt,
  randomUuid: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
});

export interface LocalMigrationResult {
  status: "none" | "already-migrated" | "migrated" | "invalid";
  players: number;
  events: number;
  attempts: number;
}

export const emptyMigrationResult = (
  status: LocalMigrationResult["status"],
): LocalMigrationResult => ({ status, players: 0, events: 0, attempts: 0 });

export function readLocalMigrationSource(
  storage: MigrationStorage = localStorage,
) {
  if (storage.getItem(markerKey)) return {
    key: null,
    state: null,
    result: emptyMigrationResult("already-migrated"),
  };
  for (const key of sourceKeys) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    const state = parseMigratableLiveEventState(raw);
    return {
      key,
      state,
      result: emptyMigrationResult(state ? "none" : "invalid"),
    };
  }
  return { key: null, state: null, result: emptyMigrationResult("none") };
}

export async function migrateLocalStateToSupabase(
  state: LiveEventState,
  sourceKey: string,
  dependencies: MigrationDependencies = productionDependencies(),
): Promise<LocalMigrationResult> {
  const playerIds = new Map<string, string>();
  for (const player of state.players) {
    const remoteId = await dependencies.upsertPlayer(
      player,
      `pr5-player:${player.id}`,
    );
    playerIds.set(player.id, remoteId);
  }

  const eventIds = new Map<string, string>();
  for (const event of state.events) {
    const participants = event.participantIds.flatMap((id) => {
      const remoteId = playerIds.get(id);
      return remoteId ? [remoteId] : [];
    });
    const remoteEventId = event.status === "completed"
      ? await dependencies.importClosedEvent(event, participants)
      : (await dependencies.startEvent(
        {
          name: event.name,
          date: event.date,
          participants: state.players
            .filter(({ id }) => event.participantIds.includes(id))
            .map((player) => ({ ...player, id: playerIds.get(player.id) ?? player.id })),
        },
        `pr5-event:${event.id}`,
        { startedAt: event.startedAt, endsAt: event.endsAt },
      )).eventId;
    eventIds.set(event.id, remoteEventId);
  }

  for (const attempt of state.attempts) {
    const remotePlayerId = playerIds.get(attempt.playerId);
    if (!remotePlayerId) continue;
    await dependencies.createAttempt(
      {
        playerId: remotePlayerId,
        eventId: attempt.eventId ? eventIds.get(attempt.eventId) : undefined,
        eventName: attempt.eventName,
        result: attempt.result,
        timeSeconds: attempt.timeSeconds,
        date: attempt.date,
        outOfCompetition: attempt.outOfCompetition,
      },
      {
        id: uuidPattern.test(attempt.id) ? attempt.id : dependencies.randomUuid(),
        legacySourceId: `pr5-attempt:${attempt.id}`,
        submittedAt: attempt.submittedAt,
      },
    );
  }

  const result: LocalMigrationResult = {
    status: "migrated",
    players: state.players.length,
    events: state.events.length,
    attempts: state.attempts.length,
  };
  dependencies.storage.setItem(markerKey, JSON.stringify({
    migratedAt: dependencies.now(),
    sourceKey,
    ...result,
  }));
  sourceKeys.forEach((key) => dependencies.storage.removeItem(key));
  return result;
}
