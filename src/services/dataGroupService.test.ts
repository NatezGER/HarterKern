import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlayers: vi.fn(),
  getLeaderboard: vi.fn(),
  getWorldRecordHistory: vi.fn(),
  getDailyWinners: vi.fn(),
  getEvents: vi.fn(),
  getMostWantedSnapshot: vi.fn(),
  getEventLeadPlayerStatistics: vi.fn(),
  getGlobalStatistics: vi.fn(),
}));

vi.mock("@/services/playerService", () => ({ getPlayers: mocks.getPlayers }));
vi.mock("@/services/statsService", () => ({
  getLeaderboard: mocks.getLeaderboard,
  getBadgeRarity: vi.fn(),
  getDailyWinners: mocks.getDailyWinners,
  getGlobalStatistics: mocks.getGlobalStatistics,
  getEventLeadPlayerStatistics: mocks.getEventLeadPlayerStatistics,
  getGroupMilestones: vi.fn(),
  getLeagueTimeStatistics: vi.fn(),
  getMostWantedSnapshot: mocks.getMostWantedSnapshot,
  getPrestigeActivities: vi.fn(),
  getWorldRecordHistory: mocks.getWorldRecordHistory,
}));
vi.mock("@/services/badgeDashboardService", () => ({ getBadgeDashboard: vi.fn() }));
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
  dataGroupCache,
  invalidateDataGroups,
  shouldRefreshDataGroup,
} from "@/services/dataGroupService";

describe("route data groups", () => {
  beforeEach(() => { vi.clearAllMocks(); dataGroupCache.invalidate(); });

  it("limits Hall of Fame to its three required database requests", () => {
    expect(getRouteDataPlan("/leaderboard")).toEqual({ required: ["leaderboard"], optional: [] });
    expect(dataGroupRequestCounts.leaderboard).toBe(3);
  });

  it("loads each statistics subroute independently", () => {
    expect(getRouteDataPlan("/stats")).toEqual({ required: ["statistics"], optional: [] });
    expect(getRouteDataPlan("/stats/performance")).toEqual({
      required: ["performance", "historical"], optional: ["badge-statistics"],
    });
    expect(getRouteDataPlan("/stats/rivalries")).toEqual({ required: ["navigation"], optional: [] });
    expect(getRouteDataPlan("/stats/badges")).toEqual({
      required: ["navigation"], optional: ["badge-rarity"],
    });
    expect(getRouteDataPlan("/").optional).toEqual(["prestige-activities"]);
    expect(dataGroupRequestCounts.statistics).toBe(5);
    expect(dataGroupRequestCounts["badge-rarity"]).toBe(1);
    expect(dataGroupRequestCounts.bingo).toBe(1);
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
      optional: ["profile-core", "profile-season", "profile-performance", "profile-events", "profile-progression"],
    });
    expect(dataGroupRequestCounts.players).toBe(2);
  });

  it("loads the event archive as its own season-aware route group", async () => {
    expect(getRouteDataPlan("/events")).toEqual({ required: ["events"], optional: [] });
    mocks.getEvents.mockResolvedValue([]);
    mocks.getGlobalStatistics.mockResolvedValue([]);
    await loadDataGroup("events", 2026);
    expect(mocks.getEvents).toHaveBeenCalledWith(2026, true, undefined);
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
    expect(mocks.getEvents).toHaveBeenNthCalledWith(1, "all-time", false, undefined);
    expect(mocks.getEvents).toHaveBeenNthCalledWith(2, 2026, false, undefined);
    expect(mocks.getGlobalStatistics).toHaveBeenCalledTimes(2);
    expect(mocks.getGlobalStatistics).toHaveBeenNthCalledWith(1, "all-time");
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

  it("loads only WR history and archive for Performance, never Most Wanted or events", async () => {
    mocks.getWorldRecordHistory.mockResolvedValue([]);
    const plan = getRouteDataPlan("/stats/performance");
    await Promise.all([...plan.required, ...plan.optional].map((group) => loadDataGroup(group)));
    expect(mocks.getWorldRecordHistory).toHaveBeenCalledOnce();
    expect(mocks.getMostWantedSnapshot).not.toHaveBeenCalled();
    expect(mocks.getEvents).not.toHaveBeenCalled();
    expect(mocks.getPlayers).not.toHaveBeenCalled();
    expect(mocks.getGlobalStatistics).not.toHaveBeenCalled();
    expect(getRouteDataPlan("/stats/performance", 2026)).toEqual({ required: ["performance"], optional: ["badge-statistics"] });
    const affected = groupsForRealtimeTable("attempts").filter((group) => plan.required.includes(group));
    expect(affected.sort()).toEqual(["historical", "performance"]);
  });

  it("loads Most Wanted only on its own statistics route", async () => {
    const plan = getRouteDataPlan("/stats/milestones");
    expect(plan).toEqual({ required: ["navigation"], optional: ["most-wanted", "team-milestones"] });
    expect(dataGroupRequestCounts["most-wanted"]).toBe(1);
    await Promise.all(plan.optional.filter(group => group === "most-wanted").map((group) => loadDataGroup(group, 2026)));
    expect(mocks.getMostWantedSnapshot).toHaveBeenCalledWith(2026);
    expect(mocks.getWorldRecordHistory).not.toHaveBeenCalled();
  });

  it("deduplicates MW reads, separates scopes, reuses TTL and invalidates only MW", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
    try {
      let finish!: (value: object) => void;
      mocks.getMostWantedSnapshot.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
      const first = loadDataGroup("most-wanted");
      expect(loadDataGroup("most-wanted")).toBe(first);
      expect(mocks.getMostWantedSnapshot).toHaveBeenCalledOnce();
      finish({});
      await first;
      mocks.getMostWantedSnapshot.mockResolvedValue({});
      await loadDataGroup("most-wanted", 2026);
      await loadDataGroup("most-wanted");
      expect(mocks.getMostWantedSnapshot).toHaveBeenCalledTimes(2);
      now.mockReturnValue(119_999);
      expect(shouldRefreshDataGroup("most-wanted", "all-time")).toBe(false);
      await loadDataGroup("most-wanted");
      expect(mocks.getMostWantedSnapshot).toHaveBeenCalledTimes(2);
      now.mockReturnValue(120_000);
      await loadDataGroup("most-wanted");
      expect(mocks.getMostWantedSnapshot).toHaveBeenCalledTimes(3);
      invalidateDataGroups(["badge-rarity"]);
      await loadDataGroup("most-wanted");
      expect(mocks.getMostWantedSnapshot).toHaveBeenCalledTimes(3);
      invalidateDataGroups(["most-wanted"]);
      await loadDataGroup("most-wanted");
      expect(mocks.getMostWantedSnapshot).toHaveBeenCalledTimes(4);
    } finally { now.mockRestore(); }
  });

  it("does not cache MW failures or repeat an invalidated read after unmount", async () => {
    mocks.getMostWantedSnapshot.mockRejectedValueOnce(new Error("timeout")).mockResolvedValue({});
    await expect(loadDataGroup("most-wanted")).rejects.toThrow("timeout");
    await loadDataGroup("most-wanted");
    expect(mocks.getMostWantedSnapshot).toHaveBeenCalledTimes(2);
    invalidateDataGroups(["most-wanted"]);
    let finish!: (value: object) => void;
    mocks.getMostWantedSnapshot.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const owner = new AbortController();
    const pending = loadDataGroup("most-wanted", "all-time", owner.signal);
    owner.abort();
    invalidateDataGroups(["most-wanted"]);
    finish({});
    await pending;
    expect(mocks.getMostWantedSnapshot).toHaveBeenCalledTimes(3);
    await loadDataGroup("most-wanted");
    expect(mocks.getMostWantedSnapshot).toHaveBeenCalledTimes(4);
  });

  it("limits MW realtime to relevant sources and never adds MW to another route", () => {
    for (const table of ["attempts", "historical_attempts", "events", "players", "event_guests"]) {
      const affected = groupsForRealtimeTable(table);
      expect(affected).toContain("most-wanted");
      expect(affected.filter(group => getRouteDataPlan("/stats/milestones").optional.includes(group) && group === "most-wanted"))
        .toEqual(["most-wanted"]);
      for (const path of ["/stats/performance", "/stats/badges"]) {
        const plan = getRouteDataPlan(path);
        expect(affected.filter(group => [...plan.required, ...plan.optional].includes(group)))
          .not.toContain("most-wanted");
      }
    }
    for (const table of ["event_photos", "event_participants", "event_statistical_pauses", "badge_definitions"]) {
      expect(groupsForRealtimeTable(table)).not.toContain("most-wanted");
    }
  });

  it("reuses fresh groups on focus, refreshes stale groups, and invalidates real changes", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
    try {
      mocks.getWorldRecordHistory.mockResolvedValue([]);
      await loadDataGroup("performance", 2026);
      expect(shouldRefreshDataGroup("performance", 2026)).toBe(false);
      now.mockReturnValue(119_999);
      await loadDataGroup("performance", 2026);
      expect(mocks.getWorldRecordHistory).toHaveBeenCalledOnce();
      now.mockReturnValue(120_001);
      expect(shouldRefreshDataGroup("performance", 2026)).toBe(true);
      await loadDataGroup("performance", 2026);
      expect(mocks.getWorldRecordHistory).toHaveBeenCalledTimes(2);
      invalidateDataGroups(["performance"]);
      await loadDataGroup("performance", 2026);
      expect(mocks.getWorldRecordHistory).toHaveBeenCalledTimes(3);
    } finally { now.mockRestore(); }
  });
});
