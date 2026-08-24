import type { Player } from "@/types";

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
