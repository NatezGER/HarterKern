import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc: mocks.rpc }) }));
import { getPerformanceDashboard, performanceDashboardCache } from "./performanceDashboardService";

beforeEach(() => { mocks.rpc.mockReset(); performanceDashboardCache.invalidate(); });
describe("isolated Performance RPC", () => {
  it("loads only the dedicated RPC, maps the chart/cards, and never requests Trophy or Unified", async () => {
    mocks.rpc.mockResolvedValue({ error: null, data: {
      regularPlayers: 2, eventCount: 4, players: [],
      attemptNumbers: [{ attemptNumber: 2, samples: 5, validCount: 5, dnfCount: 0, averageHundredths: 312 }],
      metrics: [{ key: "median", overallValue: 312, rankings: [] }], rivalryPairs: [],
    } });
    const result = await getPerformanceDashboard();
    expect(mocks.rpc.mock.calls).toEqual([["get_statistics_performance_dashboard", { p_season_year: null }]]);
    expect(result.attemptNumbers).toEqual([{ attemptNumber: 2, samples: 5, validAttempts: 5, dnfCount: 0, averageHundredths: 312 }]);
    expect(result.statistics.map(({ value }) => value)).toEqual(["2", "4"]);
    expect(result.dashboard.metrics.every(({ group }) => !["bingo", "rivalry", "achievements"].includes(group))).toBe(true);
    await getPerformanceDashboard();
    expect(mocks.rpc).toHaveBeenCalledOnce();
    await getPerformanceDashboard(2026);
    expect(mocks.rpc).toHaveBeenLastCalledWith("get_statistics_performance_dashboard", { p_season_year: 2026 });
  });
});
