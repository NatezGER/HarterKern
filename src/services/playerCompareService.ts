import { loadPlayerProfileSection } from "@/services/playerProfileService";
import type {
  PlayerProfileCore,
  PlayerSeasonProfile,
  PlayerTimePerformance,
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
