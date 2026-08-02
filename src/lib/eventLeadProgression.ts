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

export function buildEventLeadProgression(attempts: EventLeadAttempt[], eventEndAt: string | null) {
  const ordered = [...attempts]
    .filter((attempt): attempt is EventLeadAttempt & { timeHundredths: number } =>
      !attempt.isDnf && !attempt.isAk && attempt.timeHundredths != null)
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.id.localeCompare(right.id));
  const leaders: Array<EventLeadAttempt & { timeHundredths: number; improvementHundredths: number | null }> = [];
  for (const attempt of ordered) {
    const previous = leaders.at(-1);
    if (!previous || attempt.timeHundredths < previous.timeHundredths) {
      leaders.push({ ...attempt, improvementHundredths: previous ? previous.timeHundredths - attempt.timeHundredths : null });
    }
  }
  return leaders.map((leader, index): EventLeadPoint => {
    const nextAt = leaders[index + 1]?.submittedAt;
    const periodEndAt = nextAt ?? eventEndAt ?? leader.submittedAt;
    const duration = formatLeadDuration(leader.submittedAt, periodEndAt);
    return { ...leader, periodEndAt, durationLabel: nextAt ? duration : `bis Eventende · ${duration}` };
  });
}
