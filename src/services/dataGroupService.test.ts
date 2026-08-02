import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlayers: vi.fn(),
  getLeaderboard: vi.fn(),
}));

vi.mock("@/services/playerService", () => ({ getPlayers: mocks.getPlayers }));
vi.mock("@/services/statsService", () => ({
  getLeaderboard: mocks.getLeaderboard,
  getBadgeRarity: vi.fn(),
  getDailyWinners: vi.fn(),
  getGlobalStatistics: vi.fn(),
  getGroupMilestones: vi.fn(),
  getLeagueTimeStatistics: vi.fn(),
  getMostWantedSnapshot: vi.fn(),
  getPrestigeActivities: vi.fn(),
  getWorldRecordHistory: vi.fn(),
}));
vi.mock("@/services/attemptService", () => ({ getRecentAttempts: vi.fn() }));
vi.mock("@/services/eventService", () => ({ getEvents: vi.fn() }));
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

  it("invalidates only groups affected by the changed table", () => {
    expect(groupsForRealtimeTable("event_photos")).toEqual(["event-detail"]);
    expect(groupsForRealtimeTable("attempts")).toContain("leaderboard");
    expect(groupsForRealtimeTable("attempts")).toContain("most-wanted");
    expect(groupsForRealtimeTable("event_photos")).not.toContain("leaderboard");
  });
});
