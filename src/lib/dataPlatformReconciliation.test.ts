import { describe, expect, it } from "vitest";
import { reconcileDataPlatformSnapshot } from "@/lib/dataPlatformReconciliation";
import { emptyPublicData } from "@/services/publicDataService";
import type { DataPlatformSnapshot } from "@/services/dataPlatformRepository";
import type { LiveAttempt, LiveParticipant } from "@/types/liveEvent";

const player = (id: string, name = id): LiveParticipant => ({
  id,
  name,
  kind: "permanent",
  initials: name.slice(0, 2).toUpperCase(),
  avatarGradient: "from-black to-gold",
  avatarUrl: null,
  personalBest: 2.5,
  isAk: false,
});

const attempt = (id: string, timeSeconds = 2.5): LiveAttempt => ({
  id,
  playerId: "player-1",
  result: "time",
  timeSeconds,
  date: "2026-07-28",
  submittedAt: "2026-07-28T12:00:00.000Z",
  outOfCompetition: false,
});

const snapshot = (
  players: LiveParticipant[] = [],
  attempts: LiveAttempt[] = [],
): DataPlatformSnapshot => ({
  publicData: { ...emptyPublicData },
  liveState: { version: 2, players, events: [], attempts },
});

describe("Supabase snapshot reconciliation", () => {
  it("loads shared players with their canonical id", () => {
    const remote = snapshot([player("8e5b791d-8290-4d83-aaf4-dcf98f997127", "Paul")]);
    const result = reconcileDataPlatformSnapshot(snapshot(), remote);
    expect(result.liveState.players).toEqual(remote.liveState.players);
    expect(result.liveState.players[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("applies realtime insert exactly once", () => {
    const inserted = attempt("attempt-1");
    const result = reconcileDataPlatformSnapshot(
      snapshot([player("player-1")]),
      snapshot([player("player-1")], [inserted, inserted]),
    );
    expect(result.liveState.attempts).toEqual([inserted]);
  });

  it("replaces an updated attempt instead of appending it", () => {
    const result = reconcileDataPlatformSnapshot(
      snapshot([player("player-1")], [attempt("attempt-1", 2.5)]),
      snapshot([player("player-1")], [attempt("attempt-1", 2.1)]),
    );
    expect(result.liveState.attempts).toHaveLength(1);
    expect(result.liveState.attempts[0].timeSeconds).toBe(2.1);
  });

  it("removes deleted attempts and stale local overlays", () => {
    const result = reconcileDataPlatformSnapshot(
      snapshot([player("local-only")], [attempt("deleted")]),
      snapshot([player("player-1")]),
    );
    expect(result.liveState.players.map(({ id }) => id)).toEqual(["player-1"]);
    expect(result.liveState.attempts).toEqual([]);
  });

  it("does not duplicate records during repeated refetches", () => {
    const remote = snapshot([player("player-1")], [attempt("attempt-1")]);
    const once = reconcileDataPlatformSnapshot(snapshot(), remote);
    const twice = reconcileDataPlatformSnapshot(once, remote);
    expect(twice).toEqual(once);
  });

  it("keeps Hall of Fame and live profiles on the same player identity", () => {
    const id = "8e5b791d-8290-4d83-aaf4-dcf98f997127";
    const remote = snapshot([player(id, "Paul")]);
    remote.publicData.players = [{
      id,
      name: "Paul",
      initials: "PA",
      avatarGradient: "from-black to-gold",
      avatarUrl: null,
      personalBest: 2.5,
      average: 2.7,
      attempts: 4,
      validAttempts: 4,
      dnfCount: 0,
      dailyWins: 1,
      trend: "same",
      isAk: false,
      isArchived: false,
    }];
    remote.publicData.leaderboard = [{
      playerId: id,
      rank: 1,
      previousRank: 1,
      recordDate: "2026-07-28",
    }];
    const result = reconcileDataPlatformSnapshot(snapshot(), remote);
    expect(result.publicData.leaderboard[0].playerId).toBe(result.liveState.players[0].id);
    expect(result.publicData.players[0].id).toBe(result.liveState.players[0].id);
  });

  it("keeps a completed event completed after reload and deduplicates event starts", () => {
    const remote = snapshot();
    const completed = {
      id: "349372f1-df51-495f-b0dd-984a71ef8cc3",
      name: "Sommerfest",
      date: "2026-07-28",
      startedAt: "2026-07-28T10:00:00.000Z",
      endsAt: "2026-07-28T20:00:00.000Z",
      endedAt: "2026-07-28T18:00:00.000Z",
      status: "completed" as const,
      participantIds: [],
      createdBy: "Supabase",
      endReason: "manual" as const,
    };
    remote.liveState.events = [completed, completed];
    const result = reconcileDataPlatformSnapshot(snapshot(), remote);
    expect(result.liveState.events).toEqual([completed]);
    expect(result.liveState.events[0].status).toBe("completed");
  });
});
