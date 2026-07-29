import { describe, expect, it } from "vitest";
import { parseMigratableLiveEventState } from "@/lib/liveEventPersistence";
import type { LiveEventState } from "@/types/liveEvent";

describe("live event persistence", () => {
  it("restores a valid v2 state", () => {
    const state: LiveEventState = {
      version: 2,
      players: [],
      events: [],
      attempts: [],
      historicalAttempts: [],
    };
    expect(parseMigratableLiveEventState(JSON.stringify(state))).toEqual(state);
  });

  it("migrates v1 demo IDs and makes pending attempts official", () => {
    const legacy = {
      version: 1,
      role: "user",
      events: [{
        id: "event",
        date: "2026-07-27",
        startedAt: "2026-07-27T10:00:00.000Z",
        endsAt: "2026-07-28T10:00:00.000Z",
        status: "active",
        participantIds: ["demo-paul"],
        participants: [{
          id: "demo-paul",
          name: "Paul",
          initials: "P",
          avatarGradient: "",
          avatarUrl: null,
          personalBest: 2.06,
          isAk: false,
        }],
      }],
      attempts: [{
        id: "attempt",
        playerId: "demo-paul",
        eventId: "event",
        result: "time",
        timeSeconds: 1.98,
        status: "pending",
        submittedAt: "2026-07-27T11:00:00.000Z",
      }],
    };
    const migrated = parseMigratableLiveEventState(JSON.stringify(legacy));
    expect(migrated).not.toBeNull();
    if (!migrated) throw new Error("Migration fehlgeschlagen");
    expect(migrated.version).toBe(2);
    expect(migrated.players[0].id).toBe("10000000-0000-0000-0000-000000000001");
    expect(migrated.attempts).toHaveLength(1);
  });

  it.each(["{broken", JSON.stringify({ version: 0 })])(
    "rejects damaged data without inventing a fallback state",
    (raw) => expect(parseMigratableLiveEventState(raw)).toBeNull(),
  );
});
