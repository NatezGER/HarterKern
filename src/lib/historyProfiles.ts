import type { EventAttemptDetail } from "@/types/historyProfiles";

export type EventAttemptSort = "chronological" | "best";

export function sortEventAttempts(
  attempts: EventAttemptDetail[],
  sort: EventAttemptSort,
) {
  return [...attempts].sort((a, b) => {
    if (sort === "chronological") {
      return a.submittedAt.localeCompare(b.submittedAt) ||
        a.attemptNumber - b.attemptNumber ||
        a.id.localeCompare(b.id);
    }
    if (a.isDnf !== b.isDnf) return a.isDnf ? 1 : -1;
    return (a.timeHundredths ?? Number.MAX_SAFE_INTEGER) -
      (b.timeHundredths ?? Number.MAX_SAFE_INTEGER) ||
      a.submittedAt.localeCompare(b.submittedAt) ||
      a.attemptNumber - b.attemptNumber ||
      a.id.localeCompare(b.id);
  });
}

export function getAttemptClockLabel(submittedAt: string) {
  if (!submittedAt || /^\d{4}-\d{2}-\d{2}$/.test(submittedAt)) return null;
  const date = new Date(submittedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
