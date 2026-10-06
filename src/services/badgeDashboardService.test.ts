import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({
  rpc: mocks.rpc, from: mocks.from,
  storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: path } }) }) },
}) }));
import { getBadgeDashboard } from "./badgeDashboardService";
import { getPrestigeActivities } from "./statsService";
import { dataGroupCache, getRouteDataPlan, loadDataGroup, invalidateDataGroups,
  shouldRefreshDataGroup, groupsForRealtimeTable } from "./dataGroupService";
import { mayChangeBadgeStatistics } from "./badgeRealtime";
import { mergePatchForRun } from "@/hooks/dataPlatformRunGuard";
import { emptyPublicData } from "./publicDataService";
const payload = { metrics: [
  { key: "bingo-fields", overallValue: 2, rankings: [{ rank: 1, playerId: "p1",
    name: "Hunter", value: 2, count: 2, total: 100 }] },
  { key: "badge-gold", overallValue: 1, rankings: [{ rank: 1, playerId: "p1",
    name: "Hunter", value: 1 }] },
] };
beforeEach(() => {
  vi.clearAllMocks(); dataGroupCache.invalidate();
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "get_badge_rarity" ? [] : payload, error: null,
  }));
});
afterEach(() => vi.restoreAllMocks());

describe("isolated badges route", () => {
  it.each(["all-time" as const, 2026])("makes exactly two scoped reads for %s and no old/fan-out reads", async season => {
    const plan = getRouteDataPlan("/stats/badges", season);
    await Promise.all([...plan.required, ...plan.optional].map(group => loadDataGroup(group, season)));
    expect(mocks.rpc.mock.calls).toEqual([
      ["get_statistics_badge_dashboard", { p_season_year: season === "all-time" ? null : season }],
      ["get_badge_rarity"],
    ]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("keeps BINGO visible in season and career badges All-Time only", async () => {
    const eternal = await getBadgeDashboard();
    const seasonal = await getBadgeDashboard(2026);
    expect(eternal.dashboard.metrics.find(m => m.key === "badge-gold")?.rankings[0].value).toBe(1);
    expect(seasonal.dashboard.metrics.some(m => m.key.startsWith("badge-"))).toBe(false);
    expect(seasonal.dashboard.metrics.find(m => m.key === "bingo-fields")?.rankings[0].value).toBe(2);
    expect(eternal.dashboard.metrics.every(m => ["bingo","achievements"].includes(m.group))).toBe(true);
  });
  it("deduplicates, reuses TTL on focus and refreshes only invalidated reads", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
    const first = loadDataGroup("badge-statistics");
    expect(loadDataGroup("badge-statistics")).toBe(first);
    await first;
    await loadDataGroup("badge-rarity");
    now.mockReturnValue(119_999);
    expect(shouldRefreshDataGroup("badge-statistics", "all-time")).toBe(false);
    expect(shouldRefreshDataGroup("badge-rarity", 2026)).toBe(false);
    await loadDataGroup("badge-rarity", 2026);
    await loadDataGroup("badge-statistics");
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    invalidateDataGroups(["badge-statistics"]);
    await loadDataGroup("badge-statistics");
    await loadDataGroup("badge-rarity");
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
    now.mockReturnValue(140_000);
    expect(shouldRefreshDataGroup("badge-statistics", "all-time")).toBe(true);
    await loadDataGroup("badge-statistics");
    expect(mocks.rpc).toHaveBeenCalledTimes(4);
  });
  it("does not cache errors", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("timeout") });
    await expect(loadDataGroup("badge-statistics")).rejects.toThrow("timeout");
    await loadDataGroup("badge-statistics");
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it("discards stale scopes and does not restart a dirty read after unmount", async () => {
    const resolve: ((value: unknown) => void)[] = [];
    mocks.rpc.mockImplementation(() => new Promise(done => resolve.push(done)));
    const owner = new AbortController();
    const old = loadDataGroup("badge-statistics", "all-time", owner.signal);
    const seasonal = loadDataGroup("badge-statistics", 2026);
    resolve[1]({ data: payload, error: null });
    const next = mergePatchForRun({ publicData: emptyPublicData,
      liveState: { version: 2, players: [], events: [], attempts: [], historicalAttempts: [] } },
      await seasonal, 2, 2);
    owner.abort();
    invalidateDataGroups(["badge-statistics"]);
    resolve[0]({ data: payload, error: null });
    const ignored = mergePatchForRun(next, await old, 1, 2);
    expect(ignored).toBe(next);
    expect(ignored.publicData.badgeStatistics?.season).toBe(2026);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it("does not add badge reads to inactive statistics routes", () => {
    for (const route of ["/stats/performance","/stats/most-wanted","/stats/rivalries"]) {
      const plan = getRouteDataPlan(route);
      expect([...plan.required,...plan.optional]).not.toContain("badge-statistics");
      expect([...plan.required,...plan.optional]).not.toContain("badge-rarity");
      expect([...plan.required,...plan.optional]).not.toContain("prestige-activities");
    }
    expect(groupsForRealtimeTable("attempts")).not.toContain("badge-rarity");
    expect(groupsForRealtimeTable("badge-qualified-sources")).toEqual(["badge-statistics","prestige-activities"]);
    expect(groupsForRealtimeTable("player_badge_award_ledger")).toContain("badge-rarity");
  });
});

describe("prestige ledger feed consumer", () => {
  it("uses v2, preserves WR/PB/milestones and merges the existing MW activity stream", async () => {
    mocks.rpc.mockResolvedValue({ error: null, data: ["badge","world_record","personal_best","group_milestone"]
      .map((type, index) => ({ activity_id: type, activity_type: type,
        occurred_at: "2026-01-01T00:00:00Z", priority: 100 - index, display_name: "Player",
        avatar_path: null, avatar_url: null })) });
    const query = { order: vi.fn(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    query.order.mockReturnValue(query);
    mocks.from.mockReturnValue({ select: () => query });
    const result = await getPrestigeActivities();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_prestige_activity_feed_v2", { p_limit: 18 });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("most_wanted_activity_feed");
    expect(result.map(row => row.type)).toEqual(["badge","world_record","personal_best","group_milestone"]);
  });
});

describe("targeted source invalidation", () => {
  const valid = { id: "a", status: "approved", is_dnf: false, is_ak: false, time_hundredths: 300 };
  it("ignores invalid inserts, catches corrections and conservatively handles RLS old tuples", () => {
    for (const fields of [{ is_dnf: true }, { is_ak: true }, { status: "pending" }, { deleted_at: "date" }]) {
      expect(mayChangeBadgeStatistics("attempts", { eventType: "INSERT", new: { ...valid, ...fields } })).toBe(false);
    }
    expect(mayChangeBadgeStatistics("attempts", { eventType: "UPDATE", old: valid, new: { ...valid, is_dnf: true } })).toBe(true);
    expect(mayChangeBadgeStatistics("attempts", { eventType: "DELETE", old: { id: "a" } })).toBe(true);
    expect(mayChangeBadgeStatistics("historical_attempts", { eventType: "INSERT", new: { id: "h", out_of_competition: true } })).toBe(false);
  });
});
