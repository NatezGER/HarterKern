import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc: mocks.rpc }) }));

import { getStatisticDashboard, mapStatisticDashboard } from "@/services/statDashboardService";

describe("scope-aware statistic dashboard service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: { metrics: [], rivalryPairs: [] }, error: null });
  });

  it("uses one RPC with distinct All-Time, season and event arguments", async () => {
    await getStatisticDashboard();
    await getStatisticDashboard(2026);
    await getStatisticDashboard("all-time", "event-a");
    expect(mocks.rpc.mock.calls).toEqual([
      ["get_unified_statistics_dashboard", { p_season_year: null, p_event_id: null }],
      ["get_unified_statistics_dashboard", { p_season_year: 2026, p_event_id: null }],
      ["get_unified_statistics_dashboard", { p_season_year: null, p_event_id: "event-a" }],
    ]);
  });

  it("keeps arbitrary ranking rows and their competition ranks", () => {
    const dashboard = mapStatisticDashboard({ metrics: [{
      key: "average", overallValue: 342, overallCount: null, overallTotal: null,
      rankings: [
        { rank: 1, playerId: "a", name: "A", value: 291, count: 3 },
        { rank: 1, playerId: "b", name: "B", value: 291, count: 4 },
        { rank: 3, playerId: "c", name: "C", value: 318, count: 6 },
      ],
    }], rivalryPairs: [] }, "season");
    expect(dashboard?.metrics.find(({ key }) => key === "average")?.rankings.map(({ rank }) => rank))
      .toEqual([1, 1, 3]);
    expect(dashboard?.metrics.find(({ key }) => key === "average")?.minimumSample).toBe(3);
  });

  it("removes generic overall detail and formats consistency in seconds", () => {
    const dashboard = mapStatisticDashboard({ metrics: [
      { key: "median", overallValue: 300, overallDetail: "Ø der qualifizierten Spieler", rankings: [] },
      { key: "consistency", overallValue: 8, rankings: [
        { rank: 1, playerId: "a", name: "A", value: 8, count: 24, total: 5 },
      ] },
    ], rivalryPairs: [] }, "all-time");
    expect(dashboard?.metrics.find(({ key }) => key === "median")?.overallDetail).toBeNull();
    expect(dashboard?.metrics.find(({ key }) => key === "consistency")?.rankings[0]?.detail)
      .toBe("Streuung 0,24 s · Durchschnitt 3,00 s");
  });

  it("does not map event participation into ranking cards", () => {
    const dashboard = mapStatisticDashboard({ metrics: [
      { key: "event-participations", overallValue: 12, rankings: [] },
    ], rivalryPairs: [] }, "all-time");
    expect(dashboard?.metrics.some(({ key }) => key === "event-participations")).toBe(false);
  });

  it("maps both 2-in-60 metrics into volume without duplicate keys", () => {
    const dashboard = mapStatisticDashboard({ metrics: [
      { key: "two-in-sixty-total", overallValue: 12, rankings: [] },
      { key: "two-in-sixty-best", overallValue: 540, rankings: [] },
    ], rivalryPairs: [] }, "all-time");
    const metrics = dashboard?.metrics.filter(({ key }) => key.startsWith("two-in-sixty-")) ?? [];
    expect(metrics.map(({ key }) => key)).toEqual(["two-in-sixty-total", "two-in-sixty-best"]);
    expect(metrics.every(({ group }) => group === "volume")).toBe(true);
    expect(metrics.find(({ key }) => key === "two-in-sixty-best")?.minimumSample).toBe(1);
  });
});
