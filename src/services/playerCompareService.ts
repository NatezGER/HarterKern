import { loadPlayerProfileSection } from "@/services/playerProfileService";
import { getClosedEventIds } from "@/services/historyProfileService";
import { createHeadToHeadSummary, emptyHeadToHeadSummary } from "@/lib/playerCompare";
import type {
  PlayerProfileCore,
  PlayerSeasonProfile,
  PlayerTimePerformance,
  HeadToHeadSummary,
} from "@/types/historyProfiles";

export interface ComparePlayerCore {
  identity: PlayerProfileCore;
  statistics: PlayerProfileCore | PlayerSeasonProfile | null;
}

export interface PlayerCompareCore {
  playerA: ComparePlayerCore | null;
  playerB: ComparePlayerCore | null;
}

export interface PlayerCompareSpeed {
  playerA: PlayerTimePerformance | null;
  playerB: PlayerTimePerformance | null;
}

async function loadCore(playerId: string | null, seasonYear?: number) {
  if (!playerId) return null;
  const [identity, season] = await Promise.all([
    loadPlayerProfileSection("core", playerId),
    seasonYear == null
      ? Promise.resolve(null)
      : loadPlayerProfileSection("season", playerId, { seasonYear }),
  ]);
  if (!identity || identity.isAk) return null;
  return { identity, statistics: seasonYear == null ? identity : season };
}

export async function loadPlayerCompareCore(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<PlayerCompareCore> {
  const [playerA, playerB] = await Promise.all([
    loadCore(playerAId, seasonYear),
    loadCore(playerBId, seasonYear),
  ]);
  return { playerA, playerB };
}

async function loadSpeed(playerId: string | null, seasonYear?: number) {
  return playerId
    ? loadPlayerProfileSection("performance", playerId, { seasonYear })
    : null;
}

export async function loadPlayerCompareSpeed(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<PlayerCompareSpeed> {
  const [playerA, playerB] = await Promise.all([
    loadSpeed(playerAId, seasonYear),
    loadSpeed(playerBId, seasonYear),
  ]);
  return { playerA, playerB };
}

export async function loadPlayerHeadToHead(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<HeadToHeadSummary> {
  if (!playerAId || !playerBId || playerAId === playerBId) {
    return emptyHeadToHeadSummary();
  }
  const [playerAHistory, playerBHistory] = await Promise.all([
    loadPlayerProfileSection("events", playerAId),
    loadPlayerProfileSection("events", playerBId),
  ]);
  const playerBEventIds = new Set(playerBHistory.map(({ eventId }) => eventId));
  const sharedEventIds = playerAHistory
    .map(({ eventId }) => eventId)
    .filter((eventId, index, all) => (
      playerBEventIds.has(eventId) && all.indexOf(eventId) === index
    ));
  const closedEventIds = await getClosedEventIds(sharedEventIds);
  return createHeadToHeadSummary(
    playerAHistory,
    playerBHistory,
    new Set(closedEventIds),
    seasonYear,
  );
}
