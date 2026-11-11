export interface EventLeadAttempt {
  id: string;
  playerId: string | null;
  guestId: string | null;
  name: string;
  avatarUrl: string | null;
  timeHundredths: number | null;
  isDnf: boolean;
  isAk: boolean;
  submittedAt: string;
  attemptNumber: number;
}

export interface EventLeadPoint extends EventLeadAttempt {
  timeHundredths: number;
  improvementHundredths: number | null;
  periodEndAt: string;
  durationLabel: string;
}

export function formatLeadDuration(startAt: string, endAt: string) {
  const minutes = Math.max(0, Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000));
  if (minutes < 1) return "<1 Min.";
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
}

export function buildEventLeadProgression(
  attempts: EventLeadAttempt[],
  eventEndAt: string | null,
  nowAt?: string,
) {
  const ordered = [...attempts]
    .filter((attempt): attempt is EventLeadAttempt & { timeHundredths: number } =>
      !attempt.isDnf && !attempt.isAk && attempt.timeHundredths != null)
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.id.localeCompare(right.id));
  if (ordered.length < 2) return [];
  // A comparison becomes possible with the second valid time (also same player/guest).
  const initial = ordered[1].timeHundredths < ordered[0].timeHundredths ? ordered[1] : ordered[0];
  const leaders: Array<EventLeadAttempt & { timeHundredths: number; improvementHundredths: number | null }> = [{ ...initial, submittedAt: ordered[1].submittedAt, improvementHundredths: null }];
  for (const attempt of ordered.slice(2)) {
    const previous = leaders.at(-1);
    if (!previous || attempt.timeHundredths < previous.timeHundredths) {
      leaders.push({ ...attempt, improvementHundredths: previous ? previous.timeHundredths - attempt.timeHundredths : null });
    }
  }
  return leaders.map((leader, index): EventLeadPoint => {
    const nextAt = leaders[index + 1]?.submittedAt;
    const periodEndAt = nextAt ?? eventEndAt ?? nowAt ?? leader.submittedAt;
    const duration = formatLeadDuration(leader.submittedAt, periodEndAt);
    const durationLabel = nextAt ? duration
      : eventEndAt ? `bis Eventende · ${duration}` : `führt seit ${duration}`;
    return { ...leader, periodEndAt, durationLabel };
  });
}
