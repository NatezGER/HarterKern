import {
  calculateDirectRivalry,
  calculatePlayerSequenceStatistics,
} from "@/lib/playerCompareDeep";
import {
  getPlayerCompareTimeline,
  getPlayerPersonalProgression,
} from "@/services/historyProfileService";
import type {
  PlayerCompareProgressionPair,
  PlayerCompareSequencePair,
} from "@/types/playerCompare";

const sequenceInFlight = new Map<string, Promise<PlayerCompareSequencePair | null>>();
const progressionInFlight = new Map<string, Promise<Awaited<ReturnType<typeof getPlayerPersonalProgression>>>>();

export async function loadPlayerCompareSequence(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<PlayerCompareSequencePair | null> {
  if (!playerAId || !playerBId || playerAId === playerBId) return null;
  const key = `${playerAId}:${playerBId}:${seasonYear ?? "all-time"}`;
  const running = sequenceInFlight.get(key);
  if (running) return running;
  const request = getPlayerCompareTimeline(playerAId, playerBId, seasonYear)
    .then((attempts) => ({
      playerA: calculatePlayerSequenceStatistics(
        attempts.filter(({ playerId }) => playerId === playerAId),
      ),
      playerB: calculatePlayerSequenceStatistics(
        attempts.filter(({ playerId }) => playerId === playerBId),
      ),
      rivalry: calculateDirectRivalry(attempts, playerAId, playerBId),
    }))
    .finally(() => {
      if (sequenceInFlight.get(key) === request) sequenceInFlight.delete(key);
    });
  sequenceInFlight.set(key, request);
  return request;
}

export async function loadPlayerCompareProgression(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<PlayerCompareProgressionPair> {
  const [playerA, playerB] = await Promise.allSettled([
    loadProgression(playerAId, seasonYear),
    loadProgression(playerBId, seasonYear),
  ]);
  return {
    playerA: playerA.status === "fulfilled" ? playerA.value : null,
    playerB: playerB.status === "fulfilled" ? playerB.value : null,
    playerAError: playerA.status === "rejected",
    playerBError: playerB.status === "rejected",
  };
}

function loadProgression(playerId: string | null, seasonYear?: number) {
  if (!playerId) return Promise.resolve(null);
  const key = `${playerId}:${seasonYear ?? "all-time"}`;
  const running = progressionInFlight.get(key);
  if (running) return running;
  const request = getPlayerPersonalProgression(playerId, seasonYear)
    .finally(() => {
      if (progressionInFlight.get(key) === request) progressionInFlight.delete(key);
    });
  progressionInFlight.set(key, request);
  return request;
}
