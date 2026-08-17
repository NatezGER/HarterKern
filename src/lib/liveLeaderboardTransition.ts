import { getLiveStandings } from "@/lib/liveEventCalculations";
import type {
  LiveAttempt,
  LiveEvent,
  LiveEventState,
  LiveLeaderboardTransition,
} from "@/types/liveEvent";

export function deriveLiveLeaderboardTransition(input: {
  before: LiveEventState;
  event: LiveEvent;
  attempt: LiveAttempt;
}): LiveLeaderboardTransition | null {
  const { before, event, attempt } = input;
  const beforeStandings = getLiveStandings(event, before.attempts, before.players);
  const afterStandings = getLiveStandings(
    event,
    [...before.attempts.filter(({ id }) => id !== attempt.id), attempt],
    before.players,
  );
  const previous = beforeStandings.find(({ player }) => player.id === attempt.playerId);
  const next = afterStandings.find(({ player }) => player.id === attempt.playerId);
  if (!previous || !next || next.bestTime == null || next.rank == null ||
    (previous.bestTime != null && next.bestTime >= previous.bestTime)) return null;

  const previousIndex = beforeStandings.findIndex(({ player }) => player.id === attempt.playerId);
  const nextIndex = afterStandings.findIndex(({ player }) => player.id === attempt.playerId);
  const gainedPositions = Math.max(0, previousIndex - nextIndex);
  const previousEventBest = beforeStandings.find(({ bestTime }) => bestTime != null)?.bestTime ?? null;
  const isNewEventBest = previousEventBest == null || next.bestTime < previousEventBest;
  const tookLead = next.rank === 1 && previous.rank !== 1 && isNewEventBest;
  const intensity = tookLead ? "lead"
    : gainedPositions > 1 ? "multi-position"
      : gainedPositions === 1 ? "position" : "best-time";

  return {
    attempt,
    playerId: attempt.playerId,
    previousBestTime: previous.bestTime,
    nextBestTime: next.bestTime,
    previousRank: previous.rank,
    nextRank: next.rank,
    gainedPositions,
    isNewPersonalEventBest: true,
    isNewEventBest,
    tookLead,
    intensity,
    beforeStandings,
    afterStandings,
  };
}

export function enqueueLiveLeaderboardTransition(
  queue: LiveLeaderboardTransition[],
  transition: LiveLeaderboardTransition,
) {
  return queue.some(({ attempt }) => attempt.id === transition.attempt.id)
    ? queue : [...queue, transition];
}

export function completeLiveLeaderboardTransition(queue: LiveLeaderboardTransition[]) {
  return queue.slice(1);
}

export function canPresentLiveLeaderboardTransition(input: {
  hasPostAttempt: boolean;
  hasCelebration: boolean;
  hasBadgeUnlock: boolean;
  badgeLookupPending: boolean;
}) {
  return !input.hasPostAttempt && !input.hasCelebration && !input.hasBadgeUnlock &&
    !input.badgeLookupPending;
}

export function getLiveLeaderboardMotion(reducedMotion: boolean) {
  return reducedMotion
    ? { layoutDuration: 0, highlightDuration: 0, completionDelay: 1_300 }
    : { layoutDuration: 0.65, highlightDuration: 1.15, completionDelay: 1_300 };
}
