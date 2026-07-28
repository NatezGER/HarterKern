import type {
  AttemptInput,
  AttemptMilestone,
  LiveAttempt,
  LiveEvent,
  LiveParticipant,
  LiveStanding,
} from "@/types/liveEvent";

const fastest = (attempts: LiveAttempt[]) => {
  const times = attempts.flatMap((attempt) =>
    attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
  );
  return times.length ? Math.min(...times) : null;
};

export function createLiveAttempt(input: AttemptInput, id: string, now: string): LiveAttempt {
  return {
    id,
    playerId: input.playerId,
    eventId: input.eventId,
    eventName: input.eventName?.trim() || undefined,
    result: input.result,
    timeSeconds: input.result === "time" ? input.timeSeconds : undefined,
    date: input.date,
    submittedAt: now,
    outOfCompetition: input.outOfCompetition,
  };
}

export const getActiveLiveEvent = (events: LiveEvent[]) =>
  events.find((event) => event.status === "active");

export const getEventPlayers = (event: LiveEvent, players: LiveParticipant[]) =>
  event.participantIds.flatMap((id) => {
    const player = players.find((candidate) => candidate.id === id);
    return player ? [player] : [];
  });

export function getLiveStandings(
  event: LiveEvent,
  attempts: LiveAttempt[],
  players: LiveParticipant[],
): LiveStanding[] {
  const eventAttempts = attempts.filter((attempt) => attempt.eventId === event.id);
  const rows = getEventPlayers(event, players).map((player) => {
    const playerAttempts = eventAttempts.filter((attempt) => attempt.playerId === player.id);
    return {
      player,
      rank: null,
      bestTime: fastest(playerAttempts.filter((attempt) => !attempt.outOfCompetition)),
      attempts: playerAttempts.length,
      lastAttempt: [...playerAttempts].sort(
        (a, b) => b.submittedAt.localeCompare(a.submittedAt),
      )[0],
    };
  });
  rows.sort((a, b) => {
    if (a.player.isAk !== b.player.isAk) return a.player.isAk ? 1 : -1;
    if (a.bestTime == null) return b.bestTime == null
      ? a.player.name.localeCompare(b.player.name, "de")
      : 1;
    if (b.bestTime == null) return -1;
    return a.bestTime - b.bestTime || a.player.name.localeCompare(b.player.name, "de");
  });
  let previousTime: number | null = null;
  let rank = 0;
  return rows.map((row, index) => {
    if (row.player.isAk || row.bestTime == null) return row;
    if (previousTime !== row.bestTime) rank = index + 1;
    previousTime = row.bestTime;
    return { ...row, rank };
  });
}

export function finalizeLiveEvent(
  event: LiveEvent,
  attempts: LiveAttempt[],
  players: LiveParticipant[],
  reason: "manual" | "automatic",
  endedAt: string,
) {
  if (event.status === "completed") return event;
  const winner = getLiveStandings(event, attempts, players).find(
    (standing) => !standing.player.isAk && standing.bestTime != null,
  );
  return {
    ...event,
    status: "completed" as const,
    endedAt,
    endReason: reason,
    winnerPlayerId: winner?.player.id,
  };
}

export const getOfficialWorldRecord = (
  players: LiveParticipant[],
  attempts: LiveAttempt[],
) => {
  const historical = players.flatMap((player) =>
    !player.isAk && player.personalBest > 0 ? [player.personalBest] : [],
  );
  const live = attempts.flatMap((attempt) =>
    !attempt.outOfCompetition &&
    attempt.result === "time" &&
    attempt.timeSeconds != null
      ? [attempt.timeSeconds]
      : [],
  );
  const times = [...historical, ...live];
  return times.length ? Math.min(...times) : null;
};

export function getAttemptMilestones(
  players: LiveParticipant[],
  attempts: LiveAttempt[],
) {
  const personalBests = new Map(players.map((player) => [
    player.id,
    player.personalBest > 0 ? player.personalBest : Infinity,
  ]));
  let worldRecord = Math.min(
    ...players.flatMap((player) => !player.isAk && player.personalBest > 0 ? [player.personalBest] : []),
  );
  const milestones = new Map<string, AttemptMilestone>();
  [...attempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).forEach((attempt) => {
    if (attempt.result !== "time" || attempt.timeSeconds == null || attempt.outOfCompetition) {
      milestones.set(attempt.id, { isPersonalBest: false, isWorldRecord: false });
      return;
    }
    const previousPb = personalBests.get(attempt.playerId) ?? Infinity;
    const milestone = {
      isPersonalBest: attempt.timeSeconds < previousPb,
      isWorldRecord: attempt.timeSeconds < worldRecord,
    };
    milestones.set(attempt.id, milestone);
    personalBests.set(attempt.playerId, Math.min(previousPb, attempt.timeSeconds));
    worldRecord = Math.min(worldRecord, attempt.timeSeconds);
  });
  return milestones;
}
