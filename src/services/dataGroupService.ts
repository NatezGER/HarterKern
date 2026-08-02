import { getRecentAttempts } from "@/services/attemptService";
import { loadHistoricalAttempts, loadLiveState } from "@/services/dataPlatformRepository";
import { getEvents } from "@/services/eventService";
import { getPlayers } from "@/services/playerService";
import {
  getBadgeRarity,
  getDailyWinners,
  getGlobalStatistics,
  getGroupMilestones,
  getLeaderboard,
  getLeagueTimeStatistics,
  getMostWantedSnapshot,
  getPrestigeActivities,
  getWorldRecordHistory,
} from "@/services/statsService";
import type { PublicDataSnapshot } from "@/types";
import type { LiveEventState } from "@/types/liveEvent";

export type DataGroup =
  | "navigation"
  | "leaderboard"
  | "players"
  | "player-profile"
  | "event-detail"
  | "live"
  | "dashboard"
  | "statistics"
  | "prestige-activities"
  | "group-milestones"
  | "badge-rarity"
  | "most-wanted"
  | "league-time"
  | "bingo"
  | "historical";

export interface DataGroupPatch {
  publicData?: Partial<PublicDataSnapshot>;
  liveState?: Partial<LiveEventState>;
}

export interface RouteDataPlan {
  required: DataGroup[];
  optional: DataGroup[];
}

export const dataGroupRequestCounts: Record<DataGroup, number> = {
  navigation: 0,
  leaderboard: 3,
  players: 2,
  "player-profile": 3,
  "event-detail": 0,
  live: 8,
  dashboard: 12,
  statistics: 10,
  "prestige-activities": 2,
  "group-milestones": 1,
  "badge-rarity": 1,
  "most-wanted": 2,
  "league-time": 2,
  bingo: 3,
  historical: 1,
};

export function getRouteDataPlan(pathname: string): RouteDataPlan {
  if (pathname === "/leaderboard") return { required: ["leaderboard"], optional: [] };
  if (pathname === "/players") return { required: ["players"], optional: [] };
  if (pathname.startsWith("/player/")) {
    return { required: ["player-profile"], optional: [] };
  }
  if (pathname === "/stats" || pathname === "/events") {
    return {
      required: ["statistics", "historical"],
      optional: ["group-milestones", "most-wanted", "league-time", "badge-rarity"],
    };
  }
  if (pathname === "/events/live" || pathname === "/settings") {
    return { required: ["live"], optional: [] };
  }
  if (pathname === "/history") {
    return { required: ["historical"], optional: [] };
  }
  if (pathname.startsWith("/events/")) {
    return { required: ["event-detail"], optional: [] };
  }
  if (pathname === "/") {
    return { required: ["dashboard"], optional: ["prestige-activities"] };
  }
  return { required: ["navigation"], optional: [] };
}

const inFlight = new Map<DataGroup, Promise<DataGroupPatch>>();

async function loadUncached(group: DataGroup): Promise<DataGroupPatch> {
  switch (group) {
    case "navigation":
    case "event-detail":
    case "bingo":
      return {};
    case "leaderboard": {
      const [players, leaderboard] = await Promise.all([getPlayers(), getLeaderboard()]);
      return { publicData: { players, leaderboard } };
    }
    case "players":
      return { publicData: { players: await getPlayers() } };
    case "player-profile": {
      const [players, worldRecordHistory] = await Promise.all([
        getPlayers(),
        getWorldRecordHistory(),
      ]);
      return { publicData: { players, worldRecordHistory } };
    }
    case "live": {
      const players = await getPlayers();
      return {
        publicData: { players },
        liveState: await loadLiveState(players),
      };
    }
    case "dashboard": {
      const [players, leaderboard, dailyWinners, worldRecordHistory, events] =
        await Promise.all([
          getPlayers(),
          getLeaderboard(),
          getDailyWinners(),
          getWorldRecordHistory(),
          getEvents(),
        ]);
      return { publicData: { players, leaderboard, dailyWinners, worldRecordHistory, events } };
    }
    case "statistics": {
      const [players, worldRecordHistory, events, statistics, recentAttempts] =
        await Promise.all([
          getPlayers(),
          getWorldRecordHistory(),
          getEvents(),
          getGlobalStatistics(),
          getRecentAttempts(),
        ]);
      return {
        publicData: { players, worldRecordHistory, events, statistics, recentAttempts },
      };
    }
    case "prestige-activities":
      return { publicData: { activities: await getPrestigeActivities() } };
    case "group-milestones":
      return { publicData: { milestones: await getGroupMilestones() } };
    case "badge-rarity":
      return { publicData: { badgeRarity: await getBadgeRarity() } };
    case "most-wanted":
      return { publicData: { mostWanted: await getMostWantedSnapshot() } };
    case "league-time":
      return { publicData: { leagueTimeStatistics: await getLeagueTimeStatistics() } };
    case "historical":
      return { liveState: { historicalAttempts: await loadHistoricalAttempts() } };
  }
}

export function loadDataGroup(group: DataGroup): Promise<DataGroupPatch> {
  const existing = inFlight.get(group);
  if (existing) return existing;
  const request = loadUncached(group).finally(() => {
    if (inFlight.get(group) === request) inFlight.delete(group);
  });
  inFlight.set(group, request);
  return request;
}

export function groupsForRealtimeTable(table: string): DataGroup[] {
  switch (table) {
    case "players":
      return ["leaderboard", "players", "player-profile", "live", "dashboard", "statistics", "prestige-activities", "badge-rarity", "most-wanted", "bingo"];
    case "attempts":
    case "historical_attempts":
      return ["leaderboard", "players", "player-profile", "live", "dashboard", "statistics", "prestige-activities", "group-milestones", "badge-rarity", "most-wanted", "league-time", "bingo", "historical", "event-detail"];
    case "events":
    case "event_participants":
    case "event_guests":
      return ["player-profile", "live", "dashboard", "statistics", "prestige-activities", "group-milestones", "badge-rarity", "most-wanted", "league-time", "bingo", "event-detail"];
    case "event_photos":
      return ["event-detail"];
    default:
      return [];
  }
}
