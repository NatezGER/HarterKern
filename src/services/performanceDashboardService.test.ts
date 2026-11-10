import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc: mocks.rpc }) }));
import { getPerformanceDashboard, performanceDashboardCache } from "./performanceDashboardService";
import { statisticMetricByKey } from "@/constants/statMetricRegistry";

beforeEach(() => { mocks.rpc.mockReset(); performanceDashboardCache.invalidate(); });
describe("isolated Performance RPC", () => {
  it("describes the corrected event metrics without changing legacy consumers or sorting SQL rows again", async () => {
    mocks.rpc.mockResolvedValue({ error: null, data: { metrics: [
      { key: "sub4", rankings: [
        { rank: 1, playerId: "a", name: "Z", value: 100, count: 84, total: 84 },
        { rank: 1, playerId: "b", name: "A", value: 100, count: 20, total: 20 },
      ] },
      { key: "common", overallValue: 3, rankings: [{ rank: 1, playerId: "a", name: "A", value: 3, detail: "2,84 s" }] },
    ] } });
    const { dashboard } = await getPerformanceDashboard(2026);
    expect(dashboard.metrics.find(m => m.key === "sub4")?.rankings.map(r => [r.playerId, r.rank, r.total])).toEqual([["a", 1, 84], ["b", 1, 20]]);
    expect(dashboard.metrics.find(m => m.key === "sub5")?.description).toBe("Anteil gültiger Eventzeiten");
    expect(dashboard.metrics.find(m => m.key === "event-max")?.title).toBe("Meiste gültige Versuche in einem Event");
    expect(dashboard.metrics.find(m => m.key === "common")).toMatchObject({ overallFormat: "count", overallValue: 3 });
    expect(dashboard.metrics.find(m => m.key === "common")?.rankings[0].detail).toBe("2,84 s");
    expect(statisticMetricByKey.get("common")?.overallFormat).toBe("time");
    expect(statisticMetricByKey.get("event-max")?.title).toBe("Meiste Versuche in einem Event");
  });
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
    expect(result.dashboard.metrics.every(({ group }) => !["rivalry", "achievements"].includes(group))).toBe(true);
    await getPerformanceDashboard();
    expect(mocks.rpc).toHaveBeenCalledOnce();
    await getPerformanceDashboard(2026);
    expect(mocks.rpc).toHaveBeenLastCalledWith("get_statistics_performance_dashboard", { p_season_year: 2026 });
  });
});

it("isolates Near Repeat/DNF definitions and preserves first-hit ties and window evidence", async () => {
  const evidence = { eventId: "e", eventName: "Finale", eventDate: "2026-01-01", startAttempt: 2, endAttempt: 6,
    times: [200, 210, 220, 230, 240], attemptIds: ["a", "b", "c", "d", "e"], averageHundredths: 220 };
  mocks.rpc.mockResolvedValue({ error: null, data: { metrics: [
    { key: "best-five-window", rankings: [{ rank: 1, playerId: "a", value: 220, windowEvidence: evidence }] },
    { key: "most-wanted-firsts", rankings: [{ rank: 1, playerId: "a", value: 3 }, { rank: 1, playerId: "b", value: 3 }] },
  ] } });
  const { dashboard } = await getPerformanceDashboard(2026);
  expect(dashboard.metrics.find(m => m.key === "best-five-window")?.rankings[0].windowEvidence).toEqual(evidence);
  expect(dashboard.metrics.find(m => m.key === "most-wanted-firsts")?.rankings.map(r => r.rank)).toEqual([1, 1]);
  expect(dashboard.metrics.find(m => m.key === "dnf")?.minimumSample).toBe(10);
  expect(dashboard.metrics.find(m => m.key === "near-repeat")?.description).toContain("0,10");
  expect(statisticMetricByKey.get("dnf")?.minimumSample).toBe(5);
  expect(statisticMetricByKey.get("near-repeat")?.description).toContain("0,05");
  expect(dashboard.metrics.find(m => m.key === "wr-jump")?.title).toContain("SR");
  expect(statisticMetricByKey.has("most-wanted-firsts")).toBe(false);
});
