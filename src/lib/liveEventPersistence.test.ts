import { describe, expect, it } from "vitest";
import { createDemoLiveState } from "@/data/liveDemoData";
import { parseLiveEventState } from "@/lib/liveEventPersistence";

describe("live event persistence", () => {
  it("restores a valid v2 state", () => {
    const state = createDemoLiveState(new Date("2026-07-27T12:00:00.000Z"));
    expect(parseLiveEventState(JSON.stringify(state), createDemoLiveState)).toEqual(state);
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
    const migrated = parseLiveEventState(JSON.stringify(legacy), createDemoLiveState);
    expect(migrated.version).toBe(2);
    expect(migrated.players[0].id).toBe("10000000-0000-0000-0000-000000000001");
    expect(migrated.attempts).toHaveLength(1);
  });

  it.each(["{broken", JSON.stringify({ version: 0 })])(
    "falls back safely for damaged data",
    (raw) => expect(parseLiveEventState(raw, createDemoLiveState).version).toBe(2),
  );
});
