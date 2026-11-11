import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc: mocks.rpc }) }));
import { getPerformanceDashboard, performanceDashboardCache } from "./performanceDashboardService";
import { statisticMetricByKey } from "@/constants/statMetricRegistry";
import { parseChaosEvidence, parseEndspurtEvidence, parseRivalryEvidence } from "./performanceEvidence";

beforeEach(() => { performanceDashboardCache.invalidate(); mocks.rpc.mockReset(); });
const event = { eventId: "e", eventName: "Finale", eventDate: "2026-11-10" };
it.each(["all-time", 2026] as const)("maps PR B evidence and preserves server ties/order in scope %s", async season => {
  const endspurtEvidence = [{ ...event, attemptCount: 5, beforePb: 305, finalPb: 275, gain: 30,
    lastQuarter: [{ attemptId: "x", attemptNumber: 5, timeHundredths: 275, isDnf: false }] }];
  const rivalryEvidence = [{ ...event, opponents: [{ playerId: "b", name: "Ben", takeovers: 3 }] }];
  const chaosEvidence = [{ ...event, attemptId: "x", attemptNumber: 2, submittedAt: "2026-11-10T20:00:00Z",
    beforePb: 350, newPb: 270, takeovers: 1, opponents: [{ playerId: "b", name: "Ben", bestHundredths: 280 }] }];
  mocks.rpc.mockResolvedValue({ error: null, data: { metrics: [
    { key: "performance-endspurt", rankings: [{ playerId: "z", rank: 1, value: 15, count: 1, total: 2, endspurtEvidence }, { playerId: "a", rank: 1, value: 15, count: 2, total: 4 }] },
    { key: "performance-rivalry-events", rankings: [{ playerId: "z", value: 1, rivalryEvidence }] },
    { key: "performance-chaos-takeovers", rankings: [{ playerId: "z", value: 1, chaosEvidence }] },
  ] } });
  const result = await getPerformanceDashboard(season);
  const metric = (key: string) => result.dashboard.metrics.find(m => m.key === key)!;
  expect(metric("performance-endspurt")).toBeUndefined();
  expect(metric("performance-rivalry-events").rankings[0].rivalryEvidence).toEqual(rivalryEvidence);
  expect(metric("performance-chaos-takeovers").rankings[0].chaosEvidence).toEqual(chaosEvidence);
  expect(metric("fast-starter").minimumSample).toBe(2);
  expect(statisticMetricByKey.get("fast-starter")?.minimumSample).toBe(1);
  for (const key of ["late-bloomer","clutch","chaos-magnet","rivalry-events"]) expect(statisticMetricByKey.has(key)).toBe(true);
  await getPerformanceDashboard(season);
  expect(mocks.rpc).toHaveBeenCalledOnce();
  expect(mocks.rpc).toHaveBeenCalledWith("get_statistics_performance_dashboard", { p_season_year: season === "all-time" ? null : season });
});
it("rejects malformed optional evidence without inventing details", () => {
  expect(parseEndspurtEvidence([{ ...event, attemptCount: 8, beforePb: 300, finalPb: 280, gain: 20, lastQuarter: [] }])).toBeUndefined();
  expect(parseRivalryEvidence([{ ...event, opponents: [{ playerId: "a", name: "A", takeovers: 2 }] }])).toBeUndefined();
  expect(parseChaosEvidence([{ ...event, attemptId: "a", attemptNumber: 2, submittedAt: "t", beforePb: 300, newPb: 280, takeovers: 2, opponents: [] }])).toBeUndefined();
});
