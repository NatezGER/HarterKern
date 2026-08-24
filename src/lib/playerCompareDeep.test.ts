import { describe, expect, it } from "vitest";
import {
  calculateAttemptStreak,
  calculateCompareLeadSummary,
  calculateDeepPlayerStatistics,
  calculateFastestAverage,
  calculateMedian,
  calculateThresholdShare,
  compareBadgeCollections,
  mergePlayerProgressions,
  visibleAttemptNumbers,
} from "@/lib/playerCompareDeep";
import type { CompactBadge, ProgressionPoint } from "@/types/historyProfiles";
import type { PlayerCompareAttempt } from "@/types/playerCompare";

describe("deep player comparison statistics", () => {
  const attempts = [
    attempt("e1", 1, 290),
    attempt("e1", 2, 280),
    attempt("e1", 3, null, true),
    attempt("e2", 1, 310),
    attempt("e2", 2, 299),
    attempt("e2", 3, 250),
    attempt("e3", 1, 295),
    attempt("e3", 2, 296),
  ];
  const times = [290, 280, 310, 299, 250, 295, 296];

  it("calculates median, threshold shares and sorted top averages", () => {
    expect(calculateMedian([400, 200, 300])).toBe(300);
    expect(calculateMedian([400, 200, 300, 100])).toBe(250);
    expect(calculateMedian([])).toBeNull();
    expect(calculateThresholdShare(times, 300)).toBe(85.7);
    expect(calculateThresholdShare(times, 200)).toBe(0);
    expect(calculateThresholdShare([], 300)).toBeNull();
    expect(calculateFastestAverage(times, 3)).toBe(273);
    expect(calculateFastestAverage(times, 5)).toBe(282);
    expect(calculateFastestAverage(times, 8)).toBeNull();
  });

  it("lets a threshold miss and DNF break chronological streaks", () => {
    expect(calculateAttemptStreak(attempts, (time) => time < 300))
      .toEqual({ longest: 4, current: 4 });
    expect(calculateAttemptStreak(attempts, (time) => time < 400))
      .toEqual({ longest: 5, current: 5 });
    expect(calculateAttemptStreak(attempts, () => true))
      .toEqual({ longest: 5, current: 5 });
    expect(calculateAttemptStreak([...attempts, attempt("e4", 1, null, true)], () => true))
      .toEqual({ longest: 5, current: 0 });
  });

  it("derives consistency, event dominance and every attempt-number bucket", () => {
    const stats = calculateDeepPlayerStatistics(attempts, times);
    expect(stats.consistency).toMatchObject({
      medianHundredths: 295,
      rangeHundredths: 60,
      fastestThreeAverageHundredths: 273,
      fastestFiveAverageHundredths: 282,
      pbToAverageHundredths: 39,
      pbToMedianHundredths: 45,
    });
    expect(stats.eventDominance).toEqual({
      fastestFirstAttemptHundredths: 290,
      bestEventAverageHundredths: 285,
      eventsWithSub3: 3,
      eventsWithoutDnf: 2,
      perfectSub3Events: 1,
      eventsWithAttempts: 3,
    });
    expect(stats.attemptNumbers).toEqual([
      { attemptNumber: 1, samples: 3, validAttempts: 3, dnfCount: 0, averageHundredths: 298 },
      { attemptNumber: 2, samples: 3, validAttempts: 3, dnfCount: 0, averageHundredths: 292 },
      { attemptNumber: 3, samples: 2, validAttempts: 1, dnfCount: 1, averageHundredths: 250 },
    ]);
  });

  it("derives exact-repeat and PB-proximity nerd statistics", () => {
    const stats = calculateDeepPlayerStatistics([
      attempt("e1", 1, 250), attempt("e1", 2, 250), attempt("e2", 1, 275),
      attempt("e2", 2, 310),
    ], [250, 250, 275, 310]);
    expect(stats.madness).toMatchObject({
      modalTimeHundredths: 250,
      modalTimeHits: 2,
      exactRepeatCount: 1,
      withinQuarterSecondOfPbPercent: 75,
      withinHalfSecondOfPbPercent: 75,
      distinctSub3Times: 2,
      mostCommonHundredth: 50,
      mostCommonHundredthHits: 2,
    });
  });

  it("supports mobile disclosure, badge sets and neutral summary rules", () => {
    expect(visibleAttemptNumbers([1, 2, 3, 4, 5, 6], false)).toEqual([1, 2, 3, 4, 5]);
    expect(visibleAttemptNumbers([1, 2, 3, 4, 5, 6], true)).toHaveLength(6);
    const battle = compareBadgeCollections([badge("a"), badge("shared")], [badge("shared"), badge("b")]);
    expect(battle.onlyA.map(({ badgeKey }) => badgeKey)).toEqual(["a"]);
    expect(battle.shared.map(({ playerA }) => playerA.badgeKey)).toEqual(["shared"]);
    expect(battle.onlyB.map(({ badgeKey }) => badgeKey)).toEqual(["b"]);
    expect(calculateCompareLeadSummary([
      { left: 2, right: 3, direction: "lower" },
      { left: 4, right: 3, direction: "higher" },
      { left: 2, right: 2, direction: "higher" },
      { left: null, right: 2, direction: "higher" },
    ])).toEqual({ playerALeads: 2, playerBLeads: 0, ties: 1, compared: 3 });
  });

  it("merges different progression dates without aligning attempt counts", () => {
    const merged = mergePlayerProgressions(
      [progression("a2", "2026-02-01"), progression("a1", "2026-01-01")],
      [progression("b1", "2026-01-15")],
    );
    expect(merged.map(({ id, player }) => `${player}:${id}`))
      .toEqual(["a:a1", "b:b1", "a:a2"]);
  });
});

function attempt(eventId: string, attemptNumber: number, timeHundredths: number | null, isDnf = false): PlayerCompareAttempt {
  return { id: `${eventId}-${attemptNumber}`, eventId, eventDate: "2026-01-01", attemptNumber, timeHundredths, isDnf, submittedAt: `2026-01-01T00:00:0${attemptNumber}Z`, isPersonalBest: false };
}

function badge(badgeKey: string): CompactBadge {
  return { key: badgeKey, badgeKey, playerId: "p", playerName: "P", playerAvatarUrl: null, name: badgeKey, tier: "bronze", awardedAt: "2026-01-01", eventId: null, description: "", category: "", familyKey: null, requirement: "", threshold: null, recipientCount: 1, regularPlayerCount: 2, rarityPercent: 50, sourceAttemptId: null, sourceHistoricalAttemptId: null, eventName: null, sourceAttemptNumber: null, sourceTimeHundredths: null, nextBadgeName: null, nextRequirement: null, nextTier: null, nextThreshold: null, currentProgress: null, isSpecialEventBadge: false, badgeKind: "tiered", designVariant: "standard", scopeType: "all_time", bingoLineCounts: null };
}

function progression(id: string, achievedAt: string): ProgressionPoint {
  return { id, timeHundredths: 300, previousHundredths: null, achievedAt, achievedDate: achievedAt, eventId: null, sourceLabel: id, sourceType: "attempt", improvementHundredths: null, durationDays: 1, isCurrent: false };
}
