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
});
