import { describe, expect, it } from "vitest";
import { visibleFirstAttemptBenchmark } from "@/lib/firstAttemptBenchmark";
import type { LiveAttempt, LiveParticipant } from "@/types/liveEvent";

const player: LiveParticipant = {
  id: "p1", name: "Paul", kind: "permanent", initials: "P",
  avatarGradient: "", avatarUrl: null, personalBest: 2.5, isAk: false,
};
const attempt = (result: LiveAttempt["result"], outOfCompetition = false): LiveAttempt => ({
  id: "a1", playerId: "p1", eventId: "e1", result,
  timeSeconds: result === "time" ? 2.8 : undefined,
  date: "2026-09-01", submittedAt: "2026-09-01T10:00:00Z",
  outOfCompetition,
});

describe("first-attempt benchmark visibility", () => {
  it("shows the historical benchmark before a valid time, including after DNF", () => {
    expect(visibleFirstAttemptBenchmark(player, [], 284)).toBe(284);
    expect(visibleFirstAttemptBenchmark(player, [attempt("dns")], 284)).toBe(284);
  });

  it("disappears immediately after a valid event time", () => {
    expect(visibleFirstAttemptBenchmark(player, [attempt("time")], 284)).toBeNull();
    expect(visibleFirstAttemptBenchmark(player, [attempt("time", true)], 284)).toBe(284);
  });

  it("never shows to guests or AK players", () => {
    expect(visibleFirstAttemptBenchmark({ ...player, kind: "guest" }, [], 284)).toBeNull();
    expect(visibleFirstAttemptBenchmark({ ...player, isAk: true }, [], 284)).toBeNull();
    expect(visibleFirstAttemptBenchmark(player, [], undefined)).toBeNull();
  });
});
