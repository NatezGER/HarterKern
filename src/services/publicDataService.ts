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
  const [players, leaderboard, dailyWinners, worldRecordHistory, events, statistics,
    recentAttempts, activities, milestones, badgeRarity, mostWanted, leagueTimeStatistics] =
    await Promise.all([
      getPlayers(),
      getLeaderboard(),
      getDailyWinners(),
      getWorldRecordHistory(),
      getEvents(),
      getGlobalStatistics(),
      getRecentAttempts(),
      getPrestigeActivities(),
      getGroupMilestones(),
      getBadgeRarity(),
      getMostWantedSnapshot(),
      getLeagueTimeStatistics(),
    ]);
  return {
    players, leaderboard, dailyWinners, worldRecordHistory, events, statistics,
    recentAttempts, activities, milestones, badgeRarity, mostWanted, leagueTimeStatistics,
  };
}
