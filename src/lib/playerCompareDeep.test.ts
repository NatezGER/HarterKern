import { describe, expect, it } from "vitest";
import {
  calculateCompareLeadSummary,
  calculateComparePerformance,
  calculateDirectRivalry,
  calculatePlayerSequenceStatistics,
  calculateProgressionCrossovers,
  mergePlayerProgressions,
  visibleAttemptNumbers,
} from "@/lib/playerCompareDeep";
import type { ProgressionPoint } from "@/types/historyProfiles";
import type { PlayerCompareTimelineAttempt } from "@/types/playerCompare";

describe("final player compare statistics", () => {
  it("calculates every speed threshold, median, top averages and PB gaps", () => {
    const result = calculateComparePerformance([199, 240, 250, 300, 400]);
    expect(result.thresholds.map(({ seconds, percent }) => [seconds, percent]))
      .toEqual([[5, 100], [4, 80], [3, 60]]);
    expect(result.extremeThresholds.map(({ seconds, percent }) => [seconds, percent]))
      .toEqual([[2.5, 40], [2, 20]]);
    expect(result).toMatchObject({
      medianHundredths: 250,
      fastestThreeAverageHundredths: 230,
      fastestFiveAverageHundredths: 278,
      pbToAverageHundredths: 79,
      pbToMedianHundredths: 51,
    });
  });

  it("returns zero-percent extreme thresholds when valid samples exist but none qualify", () => {
    expect(calculateComparePerformance([300, 400]).extremeThresholds)
      .toMatchObject([{ seconds: 2.5, percent: 0 }, { seconds: 2, percent: 0 }]);
  });

  it("lets DNF and >=3 seconds break Sub-3 while DNF alone breaks the no-DNF streak", () => {
    const result = calculatePlayerSequenceStatistics([
      attempt("e1", "a", 1, 290, "00:01"),
      attempt("e1", "a", 2, 280, "00:02"),
      attempt("e1", "a", 3, 300, "00:03"),
      attempt("e1", "a", 4, 299, "00:04"),
      attempt("e1", "a", 5, null, "00:05", true),
      attempt("e1", "a", 6, 250, "00:06"),
    ]);
    expect(result.longestSub3Streak).toBe(2);
    expect(result.longestNoDnfStreak).toBe(4);
    expect(result.fastestFirstAttemptHundredths).toBe(290);
  });

  it("builds all attempt-number averages without inventing missing valid values", () => {
    const result = calculatePlayerSequenceStatistics([
      attempt("e1", "a", 1, 300, "00:01"),
      attempt("e1", "a", 2, null, "00:02", true),
      attempt("e2", "a", 1, 320, "00:03"),
      attempt("e2", "a", 2, null, "00:04", true),
      attempt("e2", "a", 3, 280, "00:05"),
    ]);
    expect(result.attemptNumbers).toEqual([
      { attemptNumber: 1, samples: 2, validAttempts: 2, dnfCount: 0, averageHundredths: 310 },
      { attemptNumber: 2, samples: 2, validAttempts: 0, dnfCount: 2, averageHundredths: null },
      { attemptNumber: 3, samples: 1, validAttempts: 1, dnfCount: 0, averageHundredths: 280 },
    ]);
    expect(visibleAttemptNumbers(result.attemptNumbers, false, 2)).toHaveLength(2);
    expect(visibleAttemptNumbers(result.attemptNumbers, true, 2)).toHaveLength(3);
  });

  it("calculates direct lead time and only true takeovers after comparable state", () => {
    const attempts = [
      attempt("shared", "a", 1, 300, "00:01"),
      attempt("shared", "b", 1, 320, "00:02"),
      attempt("shared", "b", 2, 290, "00:04"),
      attempt("shared", "a", 2, 290, "00:06"),
      attempt("shared", "a", 3, 280, "00:07"),
      attempt("shared", "b", 3, 270, "00:08"),
      attempt("shared", "a", 4, 260, "00:09"),
      attempt("only-a", "a", 1, 250, "00:01"),
    ];
    expect(calculateDirectRivalry(attempts, "a", "b")).toEqual({
      playerALeadSeconds: 240,
      playerBLeadSeconds: 180,
      playerALeadTakes: 1,
      playerBLeadTakes: 2,
      qualifyingEventCount: 1,
    });
  });

  it("merges progression dates and identifies actual leader crossovers", () => {
    const playerA = [progression("a1", "2026-01-01", 400), progression("a2", "2026-03-01", 370)];
    const playerB = [progression("b1", "2026-02-01", 380), progression("b2", "2026-04-01", 360)];
    expect(mergePlayerProgressions(playerA, playerB).map(({ id }) => id))
      .toEqual(["a1", "b1", "a2", "b2"]);
    expect(calculateProgressionCrossovers(playerA, playerB)).toEqual([
      { player: "a", pointId: "a2", achievedAt: "2026-03-01" },
      { player: "b", pointId: "b2", achievedAt: "2026-04-01" },
    ]);
  });

  it("counts A leads, B leads and ties while excluding nulls", () => {
    expect(calculateCompareLeadSummary([
      { left: 2, right: 3, direction: "lower" },
      { left: 2, right: 3, direction: "higher" },
      { left: 2, right: 2, direction: "higher" },
      { left: null, right: 2, direction: "higher" },
    ])).toEqual({ playerALeads: 1, playerBLeads: 1, ties: 1, compared: 3 });
  });
});

function attempt(
  eventId: string,
  playerId: string,
  attemptNumber: number,
  timeHundredths: number | null,
  minute: string,
  isDnf = false,
): PlayerCompareTimelineAttempt {
  return {
    id: `${eventId}-${playerId}-${attemptNumber}`,
    eventId,
    eventName: eventId,
    eventDate: "2026-01-01",
    eventEndAt: "2026-01-01T00:10:00Z",
    playerId,
    timeHundredths,
    isDnf,
    submittedAt: `2026-01-01T${minute}:00Z`,
    attemptNumber,
  };
}

function progression(id: string, achievedAt: string, timeHundredths: number): ProgressionPoint {
  return { id, timeHundredths, previousHundredths: null, achievedAt, achievedDate: achievedAt, eventId: null, sourceLabel: id, sourceType: "attempt", improvementHundredths: null, durationDays: 1, isCurrent: false };
}
