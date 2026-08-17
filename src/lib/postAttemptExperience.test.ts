import { describe, expect, it } from "vitest";
import {
  derivePostAttemptResult,
  getPostAttemptInitial,
  getPostAttemptSurface,
  recordCelebrationFor,
} from "@/lib/postAttemptExperience";
import type {
  BadgeUnlockCelebration,
  LiveAttempt,
  LiveEvent,
  LiveEventState,
} from "@/types/liveEvent";

const event: LiveEvent = {
  id: "event-live",
  name: "Live",
  date: "2026-08-17",
  startedAt: "2026-08-17T18:00:00Z",
  endsAt: "2026-08-17T22:00:00Z",
  status: "active",
  participantIds: ["alice", "bob"],
  createdBy: "test",
};

const before: LiveEventState = {
  version: 2,
  players: [
    { id: "alice", name: "Alice", kind: "permanent", initials: "A", avatarGradient: "", avatarUrl: null, personalBest: 2.8, isAk: false },
    { id: "bob", name: "Bob", kind: "permanent", initials: "B", avatarGradient: "", avatarUrl: null, personalBest: 2, isAk: false },
  ],
  events: [event],
  attempts: [
    { id: "event-best", playerId: "bob", eventId: event.id, result: "time", timeSeconds: 3, date: event.date, submittedAt: "2026-08-17T18:01:00Z", outOfCompetition: false },
    { id: "season-best", playerId: "bob", eventId: "older", result: "time", timeSeconds: 2.4, date: "2026-02-01", submittedAt: "2026-02-01T18:00:00Z", outOfCompetition: false },
  ],
  historicalAttempts: [],
};

function result(time?: number, options?: { result?: "time" | "dns"; outOfCompetition?: boolean }) {
  const attempt: LiveAttempt = {
    id: `new-${time ?? "dnf"}`,
    playerId: "alice",
    eventId: event.id,
    result: options?.result ?? "time",
    timeSeconds: options?.result === "dns" ? undefined : time,
    date: event.date,
    submittedAt: "2026-08-17T18:02:00Z",
    outOfCompetition: options?.outOfCompetition ?? false,
  };
  return derivePostAttemptResult({ before, event, player: before.players[0], attempt });
}

describe("post-attempt result derivation", () => {
  it("shows a normal slower attempt with the exact event-best difference", () => {
    const value = result(3.27);
    expect(value.primaryKind).toBe("normal");
    expect(value.primaryMessage).toBe("0,27 s zu langsam");
    expect(value.eventDeltaHundredths).toBe(27);
  });

  it("recognizes an event-best tie and a new event best", () => {
    expect(result(3).primaryKind).toBe("event-tie");
    expect(result(3).primaryMessage).toBe("Event-Bestzeit eingestellt");
    expect(result(2.9).primaryKind).toBe("event-best");
    const noCurrentEventTime = {
      ...before,
      attempts: before.attempts.filter(({ eventId }) => eventId !== event.id),
    };
    const first = derivePostAttemptResult({
      before: noCurrentEventTime,
      event,
      player: before.players[0],
      attempt: { id: "first", playerId: "alice", eventId: event.id, result: "time", timeSeconds: 3.1, date: event.date, submittedAt: "2026-08-17T18:03:00Z", outOfCompetition: false },
    });
    expect(first.primaryKind).toBe("event-best");
  });

  it("recognizes PB, season record and world record in priority order", () => {
    expect(result(2.7).primaryKind).toBe("pb");
    const season = result(2.3);
    expect(season.primaryKind).toBe("season-record");
    expect(season.achievements).toEqual(["Neue persönliche Bestzeit", "Eventführung"]);
    expect(recordCelebrationFor(season)?.kind).toBe("season");
    const world = result(1.9);
    expect(world.primaryKind).toBe("wr");
    expect(world.achievements).toContain("Neuer Saisonrekord 2026");
    expect(recordCelebrationFor(world)?.kind).toBe("wr");
  });

  it("handles DNF without record analysis", () => {
    const value = result(undefined, { result: "dns" });
    expect(value.primaryKind).toBe("dnf");
    expect(value.primaryMessage).toBe("Versuch gespeichert");
    expect(recordCelebrationFor(value)).toBeNull();
  });

  it("does not let an out-of-competition attempt change official records", () => {
    const value = result(1, { outOfCompetition: true });
    expect(value.primaryKind).toBe("normal");
    expect(value.primaryMessage).toBe("Versuch gespeichert");
    expect(value.achievements).toEqual([]);
  });
});

describe("post-attempt presentation sequence", () => {
  const badge: BadgeUnlockCelebration = {
    key: "badge-1", badgeKey: "first", name: "First", tier: "bronze",
    requirement: "Test", playerName: "Alice",
  };
  const attemptResult = result(1.9);
  const record = recordCelebrationFor(attemptResult);

  it("orders result, record and badge without competing surfaces", () => {
    expect(getPostAttemptSurface({ result: attemptResult, record, badge })).toBe("result");
    expect(getPostAttemptSurface({ result: null, record, badge })).toBe("record");
    expect(getPostAttemptSurface({ result: null, record: null, badge })).toBe("badge");
    expect(getPostAttemptSurface({ result: null, record: null, badge: null })).toBe("live");
  });

  it("keeps the same functional sequence with reduced motion", () => {
    expect(getPostAttemptInitial(true)).toBe(false);
    expect(getPostAttemptSurface({ result: attemptResult, record, badge })).toBe("result");
  });

  it("presents multiple badge unlocks sequentially after result and record", () => {
    const queue = [badge, { ...badge, key: "badge-2", badgeKey: "second" }];
    expect(getPostAttemptSurface({ result: null, record: null, badge: queue[0] })).toBe("badge");
    const remaining = queue.slice(1);
    expect(getPostAttemptSurface({ result: null, record: null, badge: remaining[0] })).toBe("badge");
    expect(remaining[0].key).toBe("badge-2");
  });
});
