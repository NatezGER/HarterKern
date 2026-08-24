import type { ProgressionPoint } from "@/types/historyProfiles";
import type {
  BadgeComparison,
  ComparableValue,
  CompareAttemptNumberPoint,
  CompareLeadSummary,
  CompareStreakSummary,
  PlayerCompareAttempt,
  PlayerDeepStatistics,
} from "@/types/playerCompare";
import type { CompactBadge } from "@/types/historyProfiles";

export function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function calculateThresholdShare(values: number[], thresholdHundredths: number) {
  if (values.length === 0) return null;
  const count = values.filter((value) => value < thresholdHundredths).length;
  return Math.round(count * 1_000 / values.length) / 10;
}

export function calculateDeepPlayerStatistics(
  attempts: PlayerCompareAttempt[],
  qualifiedTimes: number[],
): PlayerDeepStatistics {
  const sortedTimes = [...qualifiedTimes].sort((left, right) => left - right);
  const medianHundredths = calculateMedian(sortedTimes);
  const averageHundredths = mean(sortedTimes);
  const personalBest = sortedTimes[0] ?? null;
  const eventGroups = groupAttemptsByEvent(attempts);
  const eventAverages = [...eventGroups.values()].flatMap((eventAttempts) => {
    const validTimes = validAttemptTimes(eventAttempts);
    const average = mean(validTimes);
    return average == null ? [] : [average];
  });
  const timeMode = uniqueMode(sortedTimes);
  const hundredthMode = uniqueMode(sortedTimes.map((value) => value % 100));
  return {
    consistency: {
      medianHundredths,
      standardDeviationHundredths: standardDeviation(sortedTimes),
      rangeHundredths: sortedTimes.length === 0
        ? null
        : sortedTimes.at(-1)! - sortedTimes[0],
      fastestThreeAverageHundredths: calculateFastestAverage(sortedTimes, 3),
      fastestFiveAverageHundredths: calculateFastestAverage(sortedTimes, 5),
      pbToAverageHundredths: personalBest == null || averageHundredths == null
        ? null : averageHundredths - personalBest,
      pbToMedianHundredths: personalBest == null || medianHundredths == null
        ? null : medianHundredths - personalBest,
      sub3: calculateAttemptStreak(attempts, (time) => time < 300),
      sub4: calculateAttemptStreak(attempts, (time) => time < 400),
      noDnf: calculateAttemptStreak(attempts, () => true),
    },
    eventDominance: {
      fastestFirstAttemptHundredths: minimum(validAttemptTimes(
        attempts.filter(({ attemptNumber }) => attemptNumber === 1),
      )),
      bestEventAverageHundredths: minimum(eventAverages),
      eventsWithSub3: countEventGroups(eventGroups, (eventAttempts) => (
        validAttemptTimes(eventAttempts).some((time) => time < 300)
      )),
      eventsWithoutDnf: countEventGroups(eventGroups, (eventAttempts) => (
        eventAttempts.length > 0 && eventAttempts.every(isValidAttempt)
      )),
      perfectSub3Events: countEventGroups(eventGroups, (eventAttempts) => (
        eventAttempts.length > 0 && eventAttempts.every((attempt) => (
          isValidAttempt(attempt) && attempt.timeHundredths! < 300
        ))
      )),
      eventsWithAttempts: eventGroups.size,
    },
    attemptNumbers: calculateAttemptNumberStatistics(attempts),
    madness: {
      modalTimeHundredths: timeMode.value,
      modalTimeHits: timeMode.count,
      exactRepeatCount: repeatedValueCount(sortedTimes),
      withinQuarterSecondOfPbPercent: withinPbShare(sortedTimes, 25),
      withinHalfSecondOfPbPercent: withinPbShare(sortedTimes, 50),
      distinctSub3Times: new Set(sortedTimes.filter((time) => time < 300)).size,
      mostCommonHundredth: hundredthMode.value,
      mostCommonHundredthHits: hundredthMode.count,
    },
  };
}

export function calculateAttemptStreak(
  attempts: PlayerCompareAttempt[],
  qualifies: (timeHundredths: number) => boolean,
): CompareStreakSummary {
  let longest = 0;
  let running = 0;
  for (const attempt of attempts) {
    if (isValidAttempt(attempt) && qualifies(attempt.timeHundredths!)) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }
  let current = 0;
  for (const attempt of [...attempts].reverse()) {
    if (!isValidAttempt(attempt) || !qualifies(attempt.timeHundredths!)) break;
    current += 1;
  }
  return { longest, current };
}

export function calculateAttemptNumberStatistics(
  attempts: PlayerCompareAttempt[],
): CompareAttemptNumberPoint[] {
  const grouped = new Map<number, PlayerCompareAttempt[]>();
  for (const attempt of attempts) {
    grouped.set(attempt.attemptNumber, [...(grouped.get(attempt.attemptNumber) ?? []), attempt]);
  }
  return [...grouped.entries()].sort(([left], [right]) => left - right)
    .map(([attemptNumber, samples]) => {
      const validTimes = validAttemptTimes(samples);
      return {
        attemptNumber,
        samples: samples.length,
        validAttempts: validTimes.length,
        dnfCount: samples.filter(({ isDnf }) => isDnf).length,
        averageHundredths: mean(validTimes),
      };
    });
}

export function visibleAttemptNumbers<T>(points: T[], expanded: boolean, limit = 5) {
  return expanded ? points : points.slice(0, limit);
}

export function compareBadgeCollections(
  playerA: CompactBadge[],
  playerB: CompactBadge[],
): BadgeComparison {
  const playerAByKey = new Map(playerA.map((badge) => [badge.badgeKey, badge]));
  const playerBByKey = new Map(playerB.map((badge) => [badge.badgeKey, badge]));
  return {
    onlyA: playerA.filter(({ badgeKey }) => !playerBByKey.has(badgeKey)),
    shared: playerA.flatMap((badge) => {
      const other = playerBByKey.get(badge.badgeKey);
      return other ? [{ playerA: badge, playerB: other }] : [];
    }),
    onlyB: playerB.filter(({ badgeKey }) => !playerAByKey.has(badgeKey)),
  };
}

export function calculateCompareLeadSummary(values: ComparableValue[]): CompareLeadSummary {
  return values.reduce<CompareLeadSummary>((summary, value) => {
    if (value.left == null || value.right == null) return summary;
    summary.compared += 1;
    if (value.left === value.right) summary.ties += 1;
    else if ((value.direction === "higher" && value.left > value.right) ||
      (value.direction === "lower" && value.left < value.right)) summary.playerALeads += 1;
    else summary.playerBLeads += 1;
    return summary;
  }, { playerALeads: 0, playerBLeads: 0, ties: 0, compared: 0 });
}

export function mergePlayerProgressions(
  playerA: ProgressionPoint[],
  playerB: ProgressionPoint[],
) {
  return [
    ...playerA.map((point) => ({ ...point, player: "a" as const })),
    ...playerB.map((point) => ({ ...point, player: "b" as const })),
  ].sort((left, right) => (
    left.achievedAt.localeCompare(right.achievedAt) || left.id.localeCompare(right.id)
  ));
}

function isValidAttempt(attempt: PlayerCompareAttempt) {
  return !attempt.isDnf && attempt.timeHundredths != null;
}

function validAttemptTimes(attempts: PlayerCompareAttempt[]) {
  return attempts.flatMap((attempt) => isValidAttempt(attempt) ? [attempt.timeHundredths!] : []);
}

function groupAttemptsByEvent(attempts: PlayerCompareAttempt[]) {
  const grouped = new Map<string, PlayerCompareAttempt[]>();
  for (const attempt of attempts) {
    grouped.set(attempt.eventId, [...(grouped.get(attempt.eventId) ?? []), attempt]);
  }
  return grouped;
}

function countEventGroups(
  groups: Map<string, PlayerCompareAttempt[]>,
  predicate: (attempts: PlayerCompareAttempt[]) => boolean,
) {
  return [...groups.values()].filter(predicate).length;
}

function mean(values: number[]): number | null {
  return values.length === 0
    ? null
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function minimum(values: number[]) {
  return values.length === 0 ? null : Math.min(...values);
}

export function calculateFastestAverage(values: number[], sampleCount: number) {
  if (sampleCount <= 0 || values.length < sampleCount) return null;
  return mean([...values].sort((left, right) => left - right).slice(0, sampleCount));
}

function standardDeviation(values: number[]) {
  if (values.length === 0) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

function uniqueMode(values: number[]) {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const maximum = Math.max(0, ...counts.values());
  const modes = [...counts.entries()].filter(([, count]) => count === maximum);
  return maximum > 1 && modes.length === 1
    ? { value: modes[0][0], count: maximum }
    : { value: null, count: maximum > 1 ? maximum : 0 };
}

function repeatedValueCount(values: number[]) {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
}

function withinPbShare(values: number[], distanceHundredths: number) {
  const personalBest = values[0];
  if (personalBest == null) return null;
  const count = values.filter((value) => value <= personalBest + distanceHundredths).length;
  return Math.round(count * 1_000 / values.length) / 10;
}
