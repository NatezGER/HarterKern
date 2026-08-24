import { getEventSeason } from "@/lib/season";
import { calculateDeepPlayerStatistics } from "@/lib/playerCompareDeep";
import { getPlayerCompareAttempts } from "@/services/historyProfileService";
import { loadPlayerProfileSection } from "@/services/playerProfileService";
import type {
  PlayerDeepCompareData,
  PlayerDeepComparePair,
} from "@/types/playerCompare";

const inFlight = new Map<string, Promise<PlayerDeepCompareData | null>>();

async function loadDeepPlayer(playerId: string | null, seasonYear?: number) {
  if (!playerId) return null;
  const key = `${playerId}:${seasonYear ?? "all-time"}`;
  const running = inFlight.get(key);
  if (running) return running;
  const request = Promise.all([
    getPlayerCompareAttempts(playerId),
    loadPlayerProfileSection("events", playerId),
    loadPlayerProfileSection("performance", playerId, { seasonYear }),
    loadPlayerProfileSection("progression", playerId, { seasonYear }),
    loadPlayerProfileSection("badges", playerId),
    loadPlayerProfileSection("prestige", playerId),
  ]).then(([attemptReads, events, performance, progression, badges, prestige]) => {
    const eventDates = new Map(events.map(({ eventId, eventDate }) => [eventId, eventDate]));
    const attempts = attemptReads.flatMap((attempt) => {
      const eventDate = eventDates.get(attempt.eventId);
      if (!eventDate || (seasonYear != null && getEventSeason(eventDate) !== seasonYear)) return [];
      return [{ ...attempt, eventDate }];
    });
    return {
      statistics: calculateDeepPlayerStatistics(attempts, performance.timeHundredths),
      progression,
      badges,
      prestige,
    };
  }).finally(() => {
    if (inFlight.get(key) === request) inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}

export async function loadPlayerDeepCompare(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<PlayerDeepComparePair> {
  const [playerA, playerB] = await Promise.all([
    loadDeepPlayer(playerAId, seasonYear),
    loadDeepPlayer(playerBId, seasonYear),
  ]);
  return { playerA, playerB };
}
