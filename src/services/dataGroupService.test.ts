import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlayers: vi.fn(),
  getLeaderboard: vi.fn(),
  getWorldRecordHistory: vi.fn(),
  getDailyWinners: vi.fn(),
  getEvents: vi.fn(),
  getMostWantedSnapshot: vi.fn(),
  getEventLeadPlayerStatistics: vi.fn(),
}));

vi.mock("@/services/playerService", () => ({ getPlayers: mocks.getPlayers }));
vi.mock("@/services/statsService", () => ({
  getLeaderboard: mocks.getLeaderboard,
  getBadgeRarity: vi.fn(),
  getDailyWinners: mocks.getDailyWinners,
  getGlobalStatistics: vi.fn(),
  getEventLeadPlayerStatistics: mocks.getEventLeadPlayerStatistics,
  getGroupMilestones: vi.fn(),
  getLeagueTimeStatistics: vi.fn(),
  getMostWantedSnapshot: mocks.getMostWantedSnapshot,
  getPrestigeActivities: vi.fn(),
  getWorldRecordHistory: mocks.getWorldRecordHistory,
}));
vi.mock("@/services/attemptService", () => ({ getRecentAttempts: vi.fn() }));
vi.mock("@/services/eventService", () => ({ getEvents: mocks.getEvents }));
vi.mock("@/services/dataPlatformRepository", () => ({
  loadHistoricalAttempts: vi.fn(),
  loadLiveState: vi.fn(),
}));

import {
  dataGroupRequestCounts,
  getRouteDataPlan,
  groupsForRealtimeTable,
  loadDataGroup,
} from "@/services/dataGroupService";

describe("route data groups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("limits Hall of Fame to its three required database requests", () => {
    expect(getRouteDataPlan("/leaderboard")).toEqual({ required: ["leaderboard"], optional: [] });
    expect(dataGroupRequestCounts.leaderboard).toBe(3);
  });

  it("keeps expensive statistics and prestige models optional", () => {
    const stats = getRouteDataPlan("/stats");
    expect(stats.required).toEqual(["statistics", "historical"]);
    expect(stats.optional).toEqual([
      "group-milestones",
      "most-wanted",
      "league-time",
      "badge-rarity",
    ]);
    expect(getRouteDataPlan("/").optional).toEqual(["prestige-activities"]);
    expect(dataGroupRequestCounts.statistics).toBe(6);
    expect(dataGroupRequestCounts["badge-rarity"]).toBe(2);
  });

  it("keeps player profile reads player-scoped and independently optional", () => {
    expect(getRouteDataPlan("/player/player-1")).toEqual({
      required: ["profile-core"],
      optional: [
        "players",
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
    });
    expect(dataGroupRequestCounts["profile-core"]).toBe(0);
    expect(dataGroupRequestCounts["profile-season"]).toBe(0);
  });

  it("loads only the compare roster globally and keeps player reads scoped", () => {
    expect(getRouteDataPlan("/compare")).toEqual({
      required: ["players"],
      optional: ["profile-core", "profile-season", "profile-performance", "profile-events", "profile-progression", "profile-badges", "profile-prestige"],
    });
    expect(dataGroupRequestCounts.players).toBe(2);
  });

  it("loads the event archive as its own season-aware route group", async () => {
    expect(getRouteDataPlan("/events")).toEqual({ required: ["events"], optional: [] });
    mocks.getEvents.mockResolvedValue([]);
    await loadDataGroup("events", 2026);
    expect(mocks.getEvents).toHaveBeenCalledWith(2026);
  });

  it("loads live raw data only for live and management routes", () => {
    expect(getRouteDataPlan("/events/live").required).toContain("live");
    expect(getRouteDataPlan("/settings").required).toContain("live");
    expect(getRouteDataPlan("/leaderboard").required).not.toContain("live");
    expect(getRouteDataPlan("/players").required).not.toContain("live");
    expect(getRouteDataPlan("/stats").required).not.toContain("live");
  });

  it("deduplicates concurrent requests for the same group", async () => {
    let resolvePlayers!: (value: never[]) => void;
    mocks.getPlayers.mockReturnValue(new Promise((resolve) => { resolvePlayers = resolve; }));
    mocks.getLeaderboard.mockResolvedValue([]);
    const first = loadDataGroup("leaderboard");
    const second = loadDataGroup("leaderboard");
    expect(first).toBe(second);
    expect(mocks.getPlayers).toHaveBeenCalledOnce();
    expect(mocks.getLeaderboard).toHaveBeenCalledOnce();
    resolvePlayers([]);
    await first;
  });

  it("keeps All-Time as the default and forwards an explicit season", async () => {
    mocks.getPlayers.mockResolvedValue([]);
    mocks.getLeaderboard.mockResolvedValue([]);
    await loadDataGroup("leaderboard", 2026);
    expect(mocks.getPlayers).toHaveBeenCalledWith(2026);
    expect(mocks.getLeaderboard).toHaveBeenCalledWith(2026);
  });

  it("loads the matching WR progression for All-Time and season dashboards", async () => {
    mocks.getPlayers.mockResolvedValue([]);
    mocks.getLeaderboard.mockResolvedValue([]);
    mocks.getDailyWinners.mockResolvedValue([]);
    mocks.getWorldRecordHistory.mockResolvedValue([]);
    mocks.getEvents.mockResolvedValue([]);
    await loadDataGroup("dashboard");
    await loadDataGroup("dashboard", 2026);
    expect(mocks.getWorldRecordHistory).toHaveBeenNthCalledWith(1, "all-time");
    expect(mocks.getWorldRecordHistory).toHaveBeenNthCalledWith(2, 2026);
    expect(mocks.getEvents).toHaveBeenNthCalledWith(1, "all-time", false);
    expect(mocks.getEvents).toHaveBeenNthCalledWith(2, 2026, false);
  });

  it("loads Most Wanted for the globally selected season", async () => {
    mocks.getMostWantedSnapshot.mockResolvedValue({});
    await loadDataGroup("most-wanted");
    await loadDataGroup("most-wanted", 2026);
    expect(mocks.getMostWantedSnapshot).toHaveBeenNthCalledWith(1, "all-time");
    expect(mocks.getMostWantedSnapshot).toHaveBeenNthCalledWith(2, 2026);
  });

  it("invalidates only groups affected by the changed table", () => {
    expect(groupsForRealtimeTable("event_photos")).toEqual(["event-detail"]);
    expect(groupsForRealtimeTable("attempts")).toContain("leaderboard");
    expect(groupsForRealtimeTable("attempts")).toContain("most-wanted");
    expect(groupsForRealtimeTable("event_photos")).not.toContain("leaderboard");
    expect(groupsForRealtimeTable("players")).toContain("profile-core");
    expect(groupsForRealtimeTable("players")).not.toContain("profile-attempt-numbers");
    expect(groupsForRealtimeTable("attempts")).toContain("profile-progression");
    expect(groupsForRealtimeTable("attempts")).toContain("bingo");
  });
});
