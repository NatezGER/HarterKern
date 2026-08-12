import { getRecentAttempts } from "@/services/attemptService";
import { getEvents } from "@/services/eventService";
import { getPlayers } from "@/services/playerService";
import {
  getDailyWinners,
  getGlobalStatistics,
  getLeaderboard,
  getWorldRecordHistory,
  getPrestigeActivities,
  getGroupMilestones,
  getBadgeRarity,
  getLeagueTimeStatistics,
  getMostWantedSnapshot,
} from "@/services/statsService";
import type { PublicDataSnapshot } from "@/types";

export const emptyPublicData: PublicDataSnapshot = {
  players: [],
  leaderboard: [],
  dailyWinners: [],
  worldRecordHistory: [],
  seasonRecord: null,
  events: [],
  statistics: [],
  recentAttempts: [],
  activities: [],
  milestones: [],
  badgeRarity: [],
  mostWanted: {
    endings: [], reached: 0, total: 100, percent: 0, openEndings: [],
    mostCommonEnding: null, mostCommonHits: 0, rarestAchievedEndings: [],
  },
  leagueTimeStatistics: {
    totalValidTimes: 0, mostCommonTimeHundredths: null, mostCommonTimeHits: 0,
    mostCommonTimeParticipants: 0, smoothTimeCount: 0,
    mostCommonSmoothHundredths: null, mostCommonSmoothHits: 0,
    topSmoothPlayerId: null, topSmoothPlayerName: null, topSmoothPlayerAvatarUrl: null,
    topSmoothPlayerHits: 0, latestSmoothPlayerName: null, latestSmoothHundredths: null,
    latestSmoothAt: null, latestSmoothDate: null, latestSmoothHasExactTime: false,
    thresholds: [],
  },
};

export async function loadPublicData(): Promise<PublicDataSnapshot> {
  // Keep the public read models in bounded batches. Several of these services issue
  // parallel view queries themselves; starting every read model at once can exhaust
  // the production statement budget during a cold page load.
  const [players, leaderboard, dailyWinners, worldRecordHistory, events, statistics] =
    await Promise.all([
      getPlayers(),
      getLeaderboard(),
      getDailyWinners(),
      getWorldRecordHistory(),
      getEvents(),
      getGlobalStatistics(),
    ]);
  // The PR 8A read models share several underlying views. Evaluate them one
  // after another so PostgreSQL does not have to expand the same source graph
  // concurrently for a single browser request.
  const recentAttempts = await getRecentAttempts();
  const activities = await getPrestigeActivities();
  const milestones = await getGroupMilestones();
  const badgeRarity = await getBadgeRarity();
  const mostWanted = await getMostWantedSnapshot();
  const leagueTimeStatistics = await getLeagueTimeStatistics();
  return {
    players, leaderboard, dailyWinners, worldRecordHistory, seasonRecord: null, events, statistics,
    recentAttempts, activities, milestones, badgeRarity, mostWanted, leagueTimeStatistics,
  };
}
