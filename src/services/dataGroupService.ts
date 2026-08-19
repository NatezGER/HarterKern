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
import { ALL_TIME_SEASON } from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";

export type DataGroup =
  | "navigation"
  | "leaderboard"
  | "players"
  | "profile-core"
  | "profile-season"
  | "profile-badges"
  | "profile-trophies"
  | "profile-prestige"
  | "profile-progression"
  | "profile-performance"
  | "profile-attempt-numbers"
  | "profile-events"
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
  | "historical"
  | "events";

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
  "profile-core": 0,
  "profile-season": 0,
  "profile-badges": 0,
  "profile-trophies": 0,
  "profile-prestige": 0,
  "profile-progression": 0,
  "profile-performance": 0,
  "profile-attempt-numbers": 0,
  "profile-events": 0,
  "event-detail": 0,
  live: 8,
  dashboard: 12,
  statistics: 4,
  "prestige-activities": 2,
  "group-milestones": 1,
  "badge-rarity": 1,
  "most-wanted": 2,
  "league-time": 2,
  bingo: 3,
  historical: 1,
  events: 7,
};

export function getRouteDataPlan(pathname: string): RouteDataPlan {
  if (pathname === "/leaderboard") return { required: ["leaderboard"], optional: [] };
  if (pathname === "/players") return { required: ["players"], optional: [] };
  if (pathname.startsWith("/player/")) {
    return {
      required: ["profile-core"],
      optional: [
        "profile-season",
        "profile-trophies",
        "profile-badges",
        "profile-prestige",
        "profile-progression",
        "profile-performance",
        "bingo",
        "profile-attempt-numbers",
        "profile-events",
      ],
    };
  }
  if (pathname === "/events") return { required: ["events"], optional: [] };
  if (pathname === "/stats") {
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

const inFlight = new Map<string, Promise<DataGroupPatch>>();

async function loadUncached(group: DataGroup, season: SeasonSelection): Promise<DataGroupPatch> {
  switch (group) {
    case "navigation":
    case "event-detail":
    case "profile-core":
    case "profile-season":
    case "profile-badges":
    case "profile-trophies":
    case "profile-prestige":
    case "profile-progression":
    case "profile-performance":
    case "profile-attempt-numbers":
    case "profile-events":
    case "bingo":
      return {};
    case "events":
      return { publicData: { events: await getEvents(season) } };
    case "leaderboard": {
      const [players, leaderboard] = await Promise.all([getPlayers(season), getLeaderboard(season)]);
      return { publicData: { players, leaderboard } };
    }
    case "players":
      return { publicData: { players: await getPlayers() } };
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
          getPlayers(season),
          getLeaderboard(season),
          getDailyWinners(season),
          getWorldRecordHistory(season),
          getEvents(season, false),
        ]);
      const leader = leaderboard[0];
      const leaderPlayer = leader && players.find(({ id }) => id === leader.playerId);
      const seasonRecord = season !== ALL_TIME_SEASON && leader && leaderPlayer ? {
        id: `season-${season}-${leader.playerId}`,
        playerId: leader.playerId,
        time: leaderPlayer.personalBest,
        date: leader.recordDate,
        achievedAt: leader.recordDate,
        location: `Saison ${season}`,
        eventId: null,
        sourceType: "attempt" as const,
        previousTime: null,
        improvementHundredths: null,
        durationDays: 0,
        isCurrent: true,
      } : null;
      return { publicData: { players, leaderboard, dailyWinners, worldRecordHistory, seasonRecord, events } };
    }
    case "statistics": {
      const [players, worldRecordHistory, statistics] =
        await Promise.all([
          getPlayers(season),
          getWorldRecordHistory(season),
          getGlobalStatistics(season),
        ]);
      return {
        publicData: { players, worldRecordHistory, statistics },
      };
    }
    case "prestige-activities":
      return { publicData: { activities: await getPrestigeActivities() } };
    case "group-milestones":
      return { publicData: { milestones: await getGroupMilestones() } };
    case "badge-rarity":
      return { publicData: { badgeRarity: await getBadgeRarity() } };
    case "most-wanted":
      return { publicData: { mostWanted: await getMostWantedSnapshot(season) } };
    case "league-time":
      return { publicData: { leagueTimeStatistics: await getLeagueTimeStatistics() } };
    case "historical":
      return { liveState: { historicalAttempts: await loadHistoricalAttempts() } };
  }
}

export function loadDataGroup(
  group: DataGroup,
  season: SeasonSelection = ALL_TIME_SEASON,
): Promise<DataGroupPatch> {
  const key = `${group}:${season}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const request = loadUncached(group, season).finally(() => {
    if (inFlight.get(key) === request) inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}

export function groupsForRealtimeTable(table: string): DataGroup[] {
  switch (table) {
    case "players":
      return ["leaderboard", "players", "profile-core", "profile-season", "profile-badges", "profile-trophies", "profile-prestige", "profile-progression", "profile-performance", "profile-events", "live", "dashboard", "statistics", "prestige-activities", "badge-rarity", "most-wanted", "bingo", "events"];
    case "attempts":
    case "historical_attempts":
      return ["leaderboard", "players", "profile-core", "profile-season", "profile-badges", "profile-trophies", "profile-prestige", "profile-progression", "profile-performance", "profile-attempt-numbers", "profile-events", "live", "dashboard", "statistics", "prestige-activities", "group-milestones", "badge-rarity", "most-wanted", "league-time", "bingo", "historical", "event-detail", "events"];
    case "events":
    case "event_participants":
    case "event_guests":
      return ["profile-core", "profile-season", "profile-badges", "profile-trophies", "profile-prestige", "profile-progression", "profile-performance", "profile-attempt-numbers", "profile-events", "live", "dashboard", "statistics", "prestige-activities", "group-milestones", "badge-rarity", "most-wanted", "league-time", "bingo", "event-detail", "events"];
    case "event_photos":
      return ["event-detail"];
    default:
      return [];
  }
}
