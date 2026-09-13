import type {
  TrophyEventMilestoneFamily,
  TrophyEventSpecialMetrics,
} from "@/types/trophyEventStats";
import { formatTime } from "@/utils/format";

const stages = (id: string, current: number, thresholds: number[]) => thresholds.map((threshold) => ({
  id: `${id}-${threshold}`,
  threshold,
  current,
  achieved: current >= threshold,
}));

export function buildTrophyEventMilestones(
  metrics: TrophyEventSpecialMetrics,
): TrophyEventMilestoneFamily[] {
  return [
    {
      id: "bingo",
      name: "Bingo",
      current: metrics.bingoLines,
      maximum: 1,
      stages: stages("bingo", metrics.bingoLines, [1]),
      detail: `${metrics.bingoLines} vollständige ${metrics.bingoLines === 1 ? "Linie" : "Linien"}`,
    },
    {
      id: "most-wanted",
      name: "Most Wanted",
      current: metrics.distinctEndings,
      maximum: 100,
      stages: stages("most-wanted", metrics.distinctEndings, [10, 25, 50, 75, 100]),
      detail: `${metrics.distinctEndings} / 100 Endungen`,
    },
    {
      id: "snap-endings",
      name: "Schnapszahlen",
      current: metrics.snapEndings,
      maximum: 10,
      stages: stages("snap-endings", metrics.snapEndings, [10]),
      detail: `${metrics.snapEndings} / 10`,
    },
    {
      id: "matching-time",
      name: "Gleiche Zeit",
      current: metrics.matchingTimeParticipantCount,
      maximum: 5,
      stages: stages("matching-time", metrics.matchingTimeParticipantCount, [2, 3, 5]),
      detail: metrics.matchingTimeHundredths == null ? null
        : `${metrics.matchingTimeParticipantCount} Teilnehmer · ${formatTime(metrics.matchingTimeHundredths / 100)}${metrics.matchingTimeParticipantNames.length ? ` · ${metrics.matchingTimeParticipantNames.join(", ")}` : ""}`,
    },
    {
      id: "attempts",
      name: "Event-Versuche",
      current: metrics.validAttempts,
      maximum: 200,
      stages: stages("attempts", metrics.validAttempts, [50, 100, 200]),
      detail: `${metrics.validAttempts} gültig`,
    },
    {
      id: "common-ending",
      name: "Häufigste Endung",
      current: metrics.mostCommonEndingHits,
      maximum: 10,
      stages: stages("common-ending", metrics.mostCommonEndingHits, [2, 3, 5, 10]),
      detail: metrics.mostCommonEnding == null ? null
        : `.${String(metrics.mostCommonEnding).padStart(2, "0")} · ${metrics.mostCommonEndingHits} Treffer`,
    },
  ];
}
