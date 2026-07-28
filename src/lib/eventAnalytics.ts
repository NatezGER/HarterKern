import { getAttemptMilestones, getLiveStandings } from "@/lib/liveEventCalculations";
import type { LiveAttempt, LiveEvent, LiveParticipant } from "@/types/liveEvent";

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function getEventAnalytics(
  event: LiveEvent,
  allAttempts: LiveAttempt[],
  players: LiveParticipant[],
) {
  const attempts = allAttempts.filter(({ eventId }) => eventId === event.id);
  const participants = event.participantIds.flatMap((id) => {
    const participant = players.find((player) => player.id === id);
    return participant ? [participant] : [];
  });
  const validTimes = attempts.flatMap((attempt) =>
    attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
  );
  const milestones = getAttemptMilestones(players, allAttempts);
  const participantStats = getLiveStandings(event, attempts, players).map((standing) => {
    const participantAttempts = attempts.filter(({ playerId }) =>
      playerId === standing.player.id,
    );
    const times = participantAttempts.flatMap((attempt) =>
      attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
    );
    return {
      ...standing,
      averageTime: average(times),
      dnsCount: participantAttempts.filter(({ result }) => result === "dns").length,
      personalBests: participantAttempts.filter((attempt) =>
        milestones.get(attempt.id)?.isPersonalBest,
      ).length,
      worldRecords: participantAttempts.filter((attempt) =>
        milestones.get(attempt.id)?.isWorldRecord,
      ).length,
    };
  });
  return {
    attempts,
    participants,
    participantStats,
    standings: getLiveStandings(event, attempts, players),
    fastestTime: validTimes.length ? Math.min(...validTimes) : null,
    slowestTime: validTimes.length ? Math.max(...validTimes) : null,
    averageTime: average(validTimes),
    medianTime: median(validTimes),
    validAttempts: validTimes.length,
    dnsCount: attempts.filter(({ result }) => result === "dns").length,
    guestCount: participants.filter(({ kind }) => kind === "guest").length,
    personalBestCount: attempts.filter((attempt) =>
      milestones.get(attempt.id)?.isPersonalBest,
    ).length,
    worldRecordCount: attempts.filter((attempt) =>
      milestones.get(attempt.id)?.isWorldRecord,
    ).length,
    milestones,
  };
}
