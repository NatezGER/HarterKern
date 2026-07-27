import type {
  LiveAttempt,
  LiveAttemptResult,
  LiveEvent,
  LiveParticipant,
  LiveRole,
  LiveStanding,
} from "@/types/liveEvent";

export const isApproved = (attempt: LiveAttempt) =>
  (attempt.status ?? "approved") === "approved";

export const isCountedLive = (attempt: LiveAttempt) =>
  (attempt.status ?? "approved") !== "rejected";

export function createLiveAttempt(input: {
  id: string;
  eventId: string;
  player: LiveParticipant;
  result: LiveAttemptResult;
  timeSeconds?: number;
  role: LiveRole;
  now: string;
}) {
  const approved = input.role === "admin";
  return {
    id: input.id,
    eventId: input.eventId,
    playerId: input.player.id,
    result: input.result,
    timeSeconds: input.result === "time" ? input.timeSeconds : undefined,
    status: approved ? "approved" : "pending",
    submittedAt: input.now,
    submittedBy: approved ? "Demo-Admin" : "Demo-Nutzer",
    submittedByRole: input.role,
    approvedAt: approved ? input.now : undefined,
    approvedBy: approved ? "Demo-Admin" : undefined,
    outOfCompetition: input.player.isAk,
  } satisfies LiveAttempt;
}

export function moderateLiveAttempt(
  attempt: LiveAttempt,
  status: "approved" | "rejected",
  now: string,
) {
  if (attempt.status !== "pending") return attempt;
  return {
    ...attempt,
    status,
    approvedAt: status === "approved" ? now : undefined,
    approvedBy: status === "approved" ? "Demo-Admin" : undefined,
    rejectedAt: status === "rejected" ? now : undefined,
    rejectedBy: status === "rejected" ? "Demo-Admin" : undefined,
  } satisfies LiveAttempt;
}

export const getActiveLiveEvent = (events: LiveEvent[]) =>
  events.find((event) => event.status === "active");

const fastest = (attempts: LiveAttempt[]) => {
  const times = attempts.flatMap((attempt) =>
    attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
  );
  return times.length ? Math.min(...times) : null;
};

export function getLiveStandings(
  event: LiveEvent,
  attempts: LiveAttempt[],
): LiveStanding[] {
  const eventAttempts = attempts.filter(
    (attempt) => attempt.eventId === event.id && isCountedLive(attempt),
  );
  const rows = event.participants.map((player) => {
    const playerAttempts = eventAttempts.filter((attempt) => attempt.playerId === player.id);
    const approvedBest = fastest(playerAttempts.filter(isApproved));
    const pendingBest = fastest(playerAttempts.filter((attempt) => attempt.status === "pending"));
    return {
      player,
      rank: null,
      bestTime: fastest(playerAttempts),
      approvedBest,
      pendingBest,
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
  reason: "manual" | "automatic",
  endedAt: string,
) {
  if (event.status === "completed") return event;
  const winner = getLiveStandings(event, attempts.filter(isApproved)).find(
    (standing) => !standing.player.isAk && standing.approvedBest != null,
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
  participants: LiveParticipant[],
  attempts: LiveAttempt[],
) => {
  const historical = participants.flatMap((player) =>
    !player.isAk && player.personalBest > 0 ? [player.personalBest] : [],
  );
  const live = attempts.flatMap((attempt) =>
    isApproved(attempt) &&
    !attempt.outOfCompetition &&
    attempt.result === "time" &&
    attempt.timeSeconds != null
      ? [attempt.timeSeconds]
      : [],
  );
  const times = [...historical, ...live];
  return times.length ? Math.min(...times) : null;
};
