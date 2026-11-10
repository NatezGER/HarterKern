import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc: mock.rpc }) }));
import { getPerformanceDashboard, performanceDashboardCache } from "./performanceDashboardService";
import { performanceDevelopmentMetrics } from "@/constants/performanceDevelopmentMetrics";
beforeEach(() => { performanceDashboardCache.invalidate(); mock.rpc.mockReset(); });
it("maps all eight definitions, preserves ranks and deduplicates by season", async () => {
  const developmentEvidence = {kind:"consistent",samples:10,cv:0,mean:300.125,population:2,target:1,cutoff:0,qualified:2};
  mock.rpc.mockResolvedValue({error:null,data:{metrics:[{key:"performance-fastest-consistent",rankings:[
    {playerId:"z",rank:1,value:300.125,developmentEvidence},{playerId:"a",rank:1,value:300.125,developmentEvidence}
  ]}]}});
  const first = await getPerformanceDashboard(2026);
  await getPerformanceDashboard(2026);
  const second = await getPerformanceDashboard("all-time");
  expect(mock.rpc).toHaveBeenCalledTimes(2);
  expect(mock.rpc).toHaveBeenNthCalledWith(1,"get_statistics_performance_dashboard",{p_season_year:2026});
  expect(mock.rpc).toHaveBeenNthCalledWith(2,"get_statistics_performance_dashboard",{p_season_year:null});
  for (const m of performanceDevelopmentMetrics) expect(first.dashboard.metrics.some(x => x.key===m.key)).toBe(true);
  const metric = second.dashboard.metrics.find(m => m.key==="performance-fastest-consistent")!;
  expect(metric.rankings.map(r => [r.playerId,r.rank,r.value])).toEqual([["z",1,300.125],["a",1,300.125]]);
  expect(metric.rankings[0].developmentEvidence).toEqual(developmentEvidence);
  expect(first.dashboard.metrics.find(m => m.key==="performance-endspurt")).toBeDefined();
});
