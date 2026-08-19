import type { AttemptNumberPoint, TimeThresholdSummary } from "@/types/historyProfiles";
import type { MostWantedSnapshot } from "@/types";

export interface OfficialTimeSample {
  timeHundredths: number;
  sourceType: "attempt" | "historical_attempt";
  sourceOrder: number;
}

const THRESHOLDS = [5, 4, 3] as const;

export function calculateTimeThresholds(
  samples: Pick<OfficialTimeSample, "timeHundredths">[],
): TimeThresholdSummary[] {
  const total = samples.length;
  return THRESHOLDS.map((seconds) => {
    const count = samples.filter(({ timeHundredths }) => timeHundredths < seconds * 100).length;
    return {
      seconds,
      count,
      total,
      percent: total === 0 ? 0 : Math.round(count * 1_000 / total) / 10,
    };
  });
}

export function calculateAttemptNumberPerformance(
  samples: OfficialTimeSample[],
): AttemptNumberPoint[] {
  const grouped = new Map<number, number[]>();
  for (const sample of samples) {
    if (sample.sourceType !== "attempt" || sample.sourceOrder <= 0) continue;
    grouped.set(sample.sourceOrder, [...(grouped.get(sample.sourceOrder) ?? []), sample.timeHundredths]);
  }
  return [...grouped.entries()].sort(([left], [right]) => left - right)
    .map(([attemptNumber, times]) => ({
      attemptNumber,
      samples: times.length,
      validAttempts: times.length,
      dnfCount: 0,
      averageHundredths: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
    }));
}

export function officialTimesFromMostWanted(data: MostWantedSnapshot): OfficialTimeSample[] {
  return data.endings.flatMap((ending) => {
    const first = ending.achieved && ending.timeHundredths != null && ending.sourceType &&
      ending.sourceOrder != null ? [{
        timeHundredths: ending.timeHundredths,
        sourceType: ending.sourceType,
        sourceOrder: ending.sourceOrder,
      }] : [];
    return [
      ...first,
      ...ending.additionalHits.map((hit) => ({
        timeHundredths: hit.timeHundredths,
        sourceType: hit.sourceType,
        sourceOrder: hit.sourceOrder,
      })),
    ];
  });
}

export function dnfPercentage(validAttempts: number, dnfCount: number) {
  const total = validAttempts + dnfCount;
  return total === 0 ? 0 : Math.round(dnfCount * 1_000 / total) / 10;
}
