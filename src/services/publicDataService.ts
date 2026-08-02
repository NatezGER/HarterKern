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
};

export async function loadPublicData(): Promise<PublicDataSnapshot> {
  const [players, leaderboard, dailyWinners, worldRecordHistory, events, statistics,
    recentAttempts, activities, milestones, badgeRarity] =
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
    ]);
  return {
    players, leaderboard, dailyWinners, worldRecordHistory, events, statistics,
    recentAttempts, activities, milestones, badgeRarity,
  };
}
