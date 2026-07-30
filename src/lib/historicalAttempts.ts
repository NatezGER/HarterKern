import type { HistoricalAttempt } from "@/types/liveEvent";

export function compareHistoricalAttempts(
  left: HistoricalAttempt,
  right: HistoricalAttempt,
) {
  return left.date.localeCompare(right.date) ||
    left.sortOrder - right.sortOrder ||
    (left.sourcePriority ?? 0) - (right.sourcePriority ?? 0) ||
    (left.sourceAttemptId ?? left.id).localeCompare(
      right.sourceAttemptId ?? right.id,
    ) ||
    left.id.localeCompare(right.id);
}

export function sortHistoricalAttempts(attempts: HistoricalAttempt[]) {
  return [...attempts].sort(compareHistoricalAttempts);
}
