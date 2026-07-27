import { getRecentAttempts } from "@/services/attemptService";
import { getEvents } from "@/services/eventService";
import { getPlayers } from "@/services/playerService";
import {
  getDailyWinners,
  getGlobalStatistics,
  getLeaderboard,
  getWorldRecordHistory,
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
};

export async function loadPublicData(): Promise<PublicDataSnapshot> {
  const [players, leaderboard, dailyWinners, worldRecordHistory, events, statistics, recentAttempts] =
    await Promise.all([
      getPlayers(),
      getLeaderboard(),
      getDailyWinners(),
      getWorldRecordHistory(),
      getEvents(),
      getGlobalStatistics(),
      getRecentAttempts(),
    ]);
  return { players, leaderboard, dailyWinners, worldRecordHistory, events, statistics, recentAttempts };
}
