import type { EventAttemptDetail } from "@/types/historyProfiles";

export type EventAttemptSort = "chronological" | "best";

export function sortEventAttempts(
  attempts: EventAttemptDetail[],
  sort: EventAttemptSort,
) {
  return [...attempts].sort((a, b) => {
    if (sort === "chronological") {
      return a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id);
    }
    if (a.isDnf !== b.isDnf) return a.isDnf ? 1 : -1;
    return (a.timeHundredths ?? Number.MAX_SAFE_INTEGER) -
      (b.timeHundredths ?? Number.MAX_SAFE_INTEGER) ||
      a.submittedAt.localeCompare(b.submittedAt) ||
      a.id.localeCompare(b.id);
  });
}
