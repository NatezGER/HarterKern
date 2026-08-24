import type { Player } from "@/types";
import { getEventSeason } from "@/lib/season";
import type {
  HeadToHeadEvent,
  HeadToHeadStreak,
  HeadToHeadSummary,
  PlayerEventSummary,
} from "@/types/historyProfiles";

export type CompareDirection = "higher" | "lower";
export type CompareWinner = "a" | "b" | null;

export function evaluateCompareWinner(
  left: number | null,
  right: number | null,
  direction: CompareDirection,
): CompareWinner {
  if (left == null || right == null || left === right) return null;
  if (direction === "higher") return left > right ? "a" : "b";
  return left < right ? "a" : "b";
}

export function buildCompareUrl(playerA: string | null, playerB: string | null) {
  const params = new URLSearchParams();
  if (playerA) params.set("playerA", playerA);
  if (playerB && playerB !== playerA) params.set("playerB", playerB);
  const query = params.toString();
  return query ? `/compare?${query}` : "/compare";
}

export function replaceComparePlayer(
  current: URLSearchParams,
  side: "a" | "b",
  playerId: string,
  otherPlayerId: string | null,
) {
  const next = new URLSearchParams(current);
  if (playerId !== otherPlayerId) {
    next.set(side === "a" ? "playerA" : "playerB", playerId);
  }
  return next;
}

export function getComparePlayerOptions(players: Player[], excludedPlayerId?: string | null) {
  return players.filter(({ id, isAk, isArchived }) => (
    id !== excludedPlayerId && !isAk && !isArchived
  ));
}

export function emptyHeadToHeadSummary(): HeadToHeadSummary {
  return {
    playerAWins: 0,
    playerBWins: 0,
    ties: 0,
    totalDuels: 0,
    events: [],
    closestDuel: null,
    biggestWin: null,
    currentStreak: null,
    longestStreak: null,
  };
}

export function createHeadToHeadSummary(
  playerAHistory: PlayerEventSummary[],
  playerBHistory: PlayerEventSummary[],
  closedEventIds: ReadonlySet<string>,
  seasonYear?: number,
): HeadToHeadSummary {
  const playerBByEvent = new Map(playerBHistory.map((event) => [event.eventId, event]));
  const seen = new Set<string>();
  const events = playerAHistory.flatMap((playerAEvent): HeadToHeadEvent[] => {
    if (seen.has(playerAEvent.eventId) || !closedEventIds.has(playerAEvent.eventId)) return [];
    seen.add(playerAEvent.eventId);
    const playerBEvent = playerBByEvent.get(playerAEvent.eventId);
    if (!playerBEvent ||
      playerAEvent.validAttempts < 1 || playerBEvent.validAttempts < 1 ||
      playerAEvent.bestHundredths == null || playerBEvent.bestHundredths == null ||
      (seasonYear != null && getEventSeason(playerAEvent.eventDate) !== seasonYear)) {
      return [];
    }
    const differenceHundredths = Math.abs(
      playerAEvent.bestHundredths - playerBEvent.bestHundredths,
    );
    const winner = playerAEvent.bestHundredths === playerBEvent.bestHundredths
      ? "tie" as const
      : playerAEvent.bestHundredths < playerBEvent.bestHundredths
        ? "a" as const
        : "b" as const;
    return [{
      eventId: playerAEvent.eventId,
      eventName: playerAEvent.eventName,
      eventDate: playerAEvent.eventDate,
      playerATimeHundredths: playerAEvent.bestHundredths,
      playerBTimeHundredths: playerBEvent.bestHundredths,
      winner,
      differenceHundredths,
    }];
  }).sort((left, right) => (
    right.eventDate.localeCompare(left.eventDate) || right.eventId.localeCompare(left.eventId)
  ));
  const decided = events.filter(({ winner }) => winner !== "tie");
  return {
    playerAWins: events.filter(({ winner }) => winner === "a").length,
    playerBWins: events.filter(({ winner }) => winner === "b").length,
    ties: events.filter(({ winner }) => winner === "tie").length,
    totalDuels: events.length,
    events,
    closestDuel: selectDifferenceHighlight(decided, "closest"),
    biggestWin: selectDifferenceHighlight(decided, "biggest"),
    currentStreak: calculateCurrentStreak(events),
    longestStreak: calculateLongestStreak(events),
  };
}

export function visibleHeadToHeadEvents(
  events: HeadToHeadEvent[],
  expanded: boolean,
  limit = 5,
) {
  return expanded ? events : events.slice(0, limit);
}

function selectDifferenceHighlight(
  events: HeadToHeadEvent[],
  mode: "closest" | "biggest",
) {
  return events.reduce<HeadToHeadEvent | null>((selected, event) => {
    if (!selected) return event;
    if (mode === "closest" && event.differenceHundredths < selected.differenceHundredths) {
      return event;
    }
    if (mode === "biggest" && event.differenceHundredths > selected.differenceHundredths) {
      return event;
    }
    return selected;
  }, null);
}

function calculateCurrentStreak(events: HeadToHeadEvent[]): HeadToHeadStreak | null {
  const winner = events[0]?.winner;
  if (!winner || winner === "tie") return null;
  let length = 0;
  for (const event of events) {
    if (event.winner !== winner) break;
    length += 1;
  }
  return { winners: [winner], length };
}

function calculateLongestStreak(events: HeadToHeadEvent[]): HeadToHeadStreak | null {
  const longest = { a: 0, b: 0 };
  let activeWinner: "a" | "b" | null = null;
  let activeLength = 0;
  for (const event of [...events].reverse()) {
    if (event.winner === "tie") {
      activeWinner = null;
      activeLength = 0;
      continue;
    }
    if (event.winner === activeWinner) {
      activeLength += 1;
    } else {
      activeWinner = event.winner;
      activeLength = 1;
    }
    longest[event.winner] = Math.max(longest[event.winner], activeLength);
  }
  const length = Math.max(longest.a, longest.b);
  if (length === 0) return null;
  return {
    winners: (["a", "b"] as const).filter((winner) => longest[winner] === length),
    length,
  };
}
