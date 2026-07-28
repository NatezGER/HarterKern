import { describe, expect, it, vi } from "vitest";
import {
  migrateLocalStateToSupabase,
  readLocalMigrationSource,
} from "@/lib/localDataMigration";
import type { LiveEventState } from "@/types/liveEvent";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const localState: LiveEventState = {
  version: 2,
  players: [{
    id: "local-paul",
    name: "Paul",
    initials: "PA",
    avatarGradient: "from-black to-gold",
    avatarUrl: null,
    personalBest: 2.5,
    isAk: false,
  }],
  events: [{
    id: "local-event",
    name: "Sommerfest",
    date: "2026-07-28",
    startedAt: "2026-07-28T10:00:00.000Z",
    endsAt: "2026-07-28T20:00:00.000Z",
    status: "completed",
    endedAt: "2026-07-28T18:00:00.000Z",
    participantIds: ["local-paul"],
    createdBy: "Live-Modus",
    endReason: "manual",
  }],
  attempts: [{
    id: "local-attempt",
    playerId: "local-paul",
    eventId: "local-event",
    result: "time",
    timeSeconds: 2.5,
    date: "2026-07-28",
    submittedAt: "2026-07-28T10:01:00.000Z",
    outOfCompetition: false,
  }],
};

function createDependencies(storage: ReturnType<typeof createStorage>) {
  const players = new Map<string, string>();
  const events = new Map<string, string>();
  const attempts = new Map<string, string>();
  return {
    data: { players, events, attempts },
    dependencies: {
      storage,
      upsertPlayer: vi.fn(async (
        _player: Pick<LiveEventState["players"][number], "name" | "isAk">,
        legacyId?: string,
      ) => {
        const key = legacyId ?? "new-player";
        const id = players.get(key) ?? "8e5b791d-8290-4d83-aaf4-dcf98f997127";
        players.set(key, id);
        return id;
      }),
      startEvent: vi.fn(async () => ({
        eventId: "349372f1-df51-495f-b0dd-984a71ef8cc3",
        participantIds: ["8e5b791d-8290-4d83-aaf4-dcf98f997127"],
      })),
      importClosedEvent: vi.fn(async () => {
        const key = "pr5-event:local-event";
        const id = events.get(key) ?? "349372f1-df51-495f-b0dd-984a71ef8cc3";
        events.set(key, id);
        return id;
      }),
      createAttempt: vi.fn(async (
        _input: unknown,
        options?: { legacySourceId?: string },
      ) => {
        const key = options?.legacySourceId ?? "new-attempt";
        const id = attempts.get(key) ?? "23a12799-aaed-46b7-94b5-9a2a731be406";
        attempts.set(key, id);
        return id;
      }),
      randomUuid: () => "23a12799-aaed-46b7-94b5-9a2a731be406",
      now: () => "2026-07-28T21:00:00.000Z",
    },
  };
}

describe("local PR-5 data migration", () => {
  it("does not delete damaged local data", () => {
    const storage = createStorage({ "harter-kern-live-event-v1": "{damaged" });
    const source = readLocalMigrationSource(storage);
    expect(source.result.status).toBe("invalid");
    expect(storage.values.has("harter-kern-live-event-v1")).toBe(true);
  });

  it("migrates once, records a marker and removes only legacy source keys", async () => {
    const storage = createStorage({
      "harter-kern-live-event-v1": JSON.stringify(localState),
      "unrelated-ui-setting": "keep",
    });
    const { dependencies } = createDependencies(storage);
    const result = await migrateLocalStateToSupabase(
      localState,
      "harter-kern-live-event-v1",
      dependencies,
    );
    expect(result).toMatchObject({ status: "migrated", players: 1, events: 1, attempts: 1 });
    expect(readLocalMigrationSource(storage).result.status).toBe("already-migrated");
    expect(storage.values.has("harter-kern-live-event-v1")).toBe(false);
    expect(storage.values.get("unrelated-ui-setting")).toBe("keep");
  });

  it("uses stable legacy keys so a retry cannot create duplicate records", async () => {
    const firstStorage = createStorage();
    const shared = createDependencies(firstStorage);
    await migrateLocalStateToSupabase(localState, "harter-kern-live-event-v1", shared.dependencies);
    const retryStorage = createStorage();
    await migrateLocalStateToSupabase(localState, "harter-kern-live-event-v1", {
      ...shared.dependencies,
      storage: retryStorage,
    });
    expect(shared.data.players.size).toBe(1);
    expect(shared.data.events.size).toBe(1);
    expect(shared.data.attempts.size).toBe(1);
  });

  it("keeps the source and writes no marker when an import fails", async () => {
    const storage = createStorage({
      "harter-kern-live-event-v1": JSON.stringify(localState),
    });
    const { dependencies } = createDependencies(storage);
    dependencies.createAttempt.mockRejectedValueOnce(new Error("network"));
    await expect(migrateLocalStateToSupabase(
      localState,
      "harter-kern-live-event-v1",
      dependencies,
    )).rejects.toThrow("network");
    expect(storage.values.has("harter-kern-live-event-v1")).toBe(true);
    expect(readLocalMigrationSource(storage).result.status).toBe("none");
  });
});
