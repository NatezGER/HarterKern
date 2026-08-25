import type { PlayerTimePerformance, ProgressionPoint, TimeThresholdSummary } from "@/types/historyProfiles";
import type {
  ComparableValue,
  CompareAttemptNumberPoint,
  CompareLeadSummary,
  DirectRivalrySummary,
  PlayerCompareSequenceStatistics,
  PlayerCompareTimelineAttempt,
  ProgressionCrossover,
} from "@/types/playerCompare";

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

export function calculateFastestAverage(values: number[], sampleCount: number) {
  if (sampleCount <= 0 || values.length < sampleCount) return null;
  return roundedMean([...values].sort((left, right) => left - right).slice(0, sampleCount));
}

export function calculateStandardDeviation(values: number[]) {
  if (values.length === 0) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

export function calculateComparePerformance(values: number[]): PlayerTimePerformance {
  const sorted = [...values].sort((left, right) => left - right);
  const medianHundredths = calculateMedian(sorted);
  const averageHundredths = roundedMean(sorted);
  const personalBestHundredths = sorted[0] ?? null;
  return {
    thresholds: ([5, 4, 3] as const).map((seconds) => thresholdSummary(sorted, seconds)),
    extremeThresholds: ([2.5, 2] as const).map((seconds) => thresholdSummary(sorted, seconds)),
    medianHundredths,
    standardDeviationHundredths: calculateStandardDeviation(sorted),
    fastestThreeAverageHundredths: calculateFastestAverage(sorted, 3),
    fastestFiveAverageHundredths: calculateFastestAverage(sorted, 5),
    pbToAverageHundredths: personalBestHundredths == null || averageHundredths == null
      ? null : averageHundredths - personalBestHundredths,
    pbToMedianHundredths: personalBestHundredths == null || medianHundredths == null
      ? null : medianHundredths - personalBestHundredths,
  };
}

export function calculatePlayerSequenceStatistics(
  attempts: PlayerCompareTimelineAttempt[],
): PlayerCompareSequenceStatistics {
  const ordered = orderAttempts(attempts);
  return {
    longestSub3Streak: calculateLongestAttemptStreak(ordered, (time) => time < 300),
    longestNoDnfStreak: calculateLongestAttemptStreak(ordered, () => true),
    fastestFirstAttemptHundredths: minimum(validTimes(
      ordered.filter(({ attemptNumber }) => attemptNumber === 1),
    )),
    attemptNumbers: calculateAttemptNumberStatistics(ordered),
  };
}

export function calculateLongestAttemptStreak(
  attempts: PlayerCompareTimelineAttempt[],
  qualifies: (timeHundredths: number) => boolean,
) {
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
  return longest;
}

export function calculateAttemptNumberStatistics(
  attempts: PlayerCompareTimelineAttempt[],
): CompareAttemptNumberPoint[] {
  const grouped = new Map<number, PlayerCompareTimelineAttempt[]>();
  for (const attempt of attempts) {
    grouped.set(attempt.attemptNumber, [...(grouped.get(attempt.attemptNumber) ?? []), attempt]);
  }
  return [...grouped.entries()].sort(([left], [right]) => left - right)
    .map(([attemptNumber, samples]) => {
      const times = validTimes(samples);
      return {
        attemptNumber,
        samples: samples.length,
        validAttempts: times.length,
        dnfCount: samples.filter(({ isDnf }) => isDnf).length,
        averageHundredths: roundedMean(times),
      };
    });
}

export function calculateDirectRivalry(
  attempts: PlayerCompareTimelineAttempt[],
  playerAId: string,
  playerBId: string,
): DirectRivalrySummary {
  const summary: DirectRivalrySummary = {
    playerALeadSeconds: 0,
    playerBLeadSeconds: 0,
    playerALeadTakes: 0,
    playerBLeadTakes: 0,
    qualifyingEventCount: 0,
  };
  const byEvent = groupBy(attempts, ({ eventId }) => eventId);
  for (const eventAttempts of byEvent.values()) {
    const hasValidA = eventAttempts.some((attempt) => attempt.playerId === playerAId && isValidAttempt(attempt));
    const hasValidB = eventAttempts.some((attempt) => attempt.playerId === playerBId && isValidAttempt(attempt));
    if (!hasValidA || !hasValidB) continue;
    summary.qualifyingEventCount += 1;
    let bestA: number | null = null;
    let bestB: number | null = null;
    let leader: "a" | "b" | null = null;
    let lastAt: string | null = null;
    const ordered = orderAttempts(eventAttempts);
    for (const attempt of ordered) {
      if (lastAt) addLeadDuration(summary, leader, lastAt, attempt.submittedAt);
      const previousLeader = leader;
      if (isValidAttempt(attempt)) {
        if (attempt.playerId === playerAId) bestA = minimumValue(bestA, attempt.timeHundredths!);
        if (attempt.playerId === playerBId) bestB = minimumValue(bestB, attempt.timeHundredths!);
      }
      leader = directLeader(bestA, bestB);
      if (previousLeader === "b" && leader === "a" && attempt.playerId === playerAId) {
        summary.playerALeadTakes += 1;
      }
      if (previousLeader === "a" && leader === "b" && attempt.playerId === playerBId) {
        summary.playerBLeadTakes += 1;
      }
      lastAt = attempt.submittedAt;
    }
    if (lastAt) addLeadDuration(summary, leader, lastAt, ordered[0].eventEndAt);
  }
  return summary;
}

export function visibleAttemptNumbers<T>(points: T[], expanded: boolean, limit = 5) {
  return expanded ? points : points.slice(0, limit);
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

export function mergePlayerProgressions(playerA: ProgressionPoint[], playerB: ProgressionPoint[]) {
  return [
    ...playerA.map((point) => ({ ...point, player: "a" as const })),
    ...playerB.map((point) => ({ ...point, player: "b" as const })),
  ].sort((left, right) => (
    left.achievedAt.localeCompare(right.achievedAt) || left.id.localeCompare(right.id)
  ));
}

export function calculateProgressionCrossovers(
  playerA: ProgressionPoint[],
  playerB: ProgressionPoint[],
): ProgressionCrossover[] {
  const merged = mergePlayerProgressions(playerA, playerB);
  let bestA: number | null = null;
  let bestB: number | null = null;
  let leader: "a" | "b" | null = null;
  const crossovers: ProgressionCrossover[] = [];
  for (let index = 0; index < merged.length;) {
    const achievedAt = merged[index].achievedAt;
    const moment = merged.slice(index).filter((point) => point.achievedAt === achievedAt);
    for (const point of moment) {
      if (point.player === "a") bestA = point.timeHundredths;
      else bestB = point.timeHundredths;
    }
    const nextLeader = directLeader(bestA, bestB);
    if (leader && nextLeader && leader !== nextLeader) {
      const trigger = [...moment].reverse().find(({ player }) => player === nextLeader) ?? moment.at(-1)!;
      crossovers.push({ player: nextLeader, pointId: trigger.id, achievedAt });
    }
    leader = nextLeader;
    index += moment.length;
  }
  return crossovers;
}

function thresholdSummary(
  values: number[],
  seconds: TimeThresholdSummary["seconds"],
): TimeThresholdSummary {
  const count = values.filter((value) => value < seconds * 100).length;
  return {
    seconds,
    count,
    total: values.length,
    percent: values.length === 0 ? 0 : Math.round(count * 1_000 / values.length) / 10,
  };
}

function isValidAttempt(attempt: PlayerCompareTimelineAttempt) {
  return !attempt.isDnf && attempt.timeHundredths != null;
}

function validTimes(attempts: PlayerCompareTimelineAttempt[]) {
  return attempts.flatMap((attempt) => isValidAttempt(attempt) ? [attempt.timeHundredths!] : []);
}

function orderAttempts(attempts: PlayerCompareTimelineAttempt[]) {
  return [...attempts].sort((left, right) => (
    left.submittedAt.localeCompare(right.submittedAt) || left.id.localeCompare(right.id)
  ));
}

function roundedMean(values: number[]): number | null {
  return values.length === 0
    ? null
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function minimum(values: number[]) {
  return values.length === 0 ? null : Math.min(...values);
}

function minimumValue(current: number | null, candidate: number) {
  return current == null ? candidate : Math.min(current, candidate);
}

function directLeader(bestA: number | null, bestB: number | null): "a" | "b" | null {
  if (bestA == null || bestB == null || bestA === bestB) return null;
  return bestA < bestB ? "a" : "b";
}

function addLeadDuration(
  summary: DirectRivalrySummary,
  leader: "a" | "b" | null,
  startAt: string,
  endAt: string,
) {
  if (!leader) return;
  const seconds = Math.max(0, Math.floor((Date.parse(endAt) - Date.parse(startAt)) / 1_000));
  if (leader === "a") summary.playerALeadSeconds += seconds;
  else summary.playerBLeadSeconds += seconds;
}

function groupBy<T, Key>(values: T[], keyOf: (value: T) => Key) {
  const grouped = new Map<Key, T[]>();
  for (const value of values) {
    const key = keyOf(value);
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  return grouped;
}
