import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock("@/lib/supabase",()=>({getSupabase:()=>({rpc:mocks.rpc})}));
import { getPerformanceDetail, performanceDetailCache } from "./performanceDetailService";
import { invalidateDataGroups } from "./dataGroupService";
beforeEach(()=>{performanceDetailCache.invalidate();mocks.rpc.mockReset();mocks.rpc.mockResolvedValue({data:{rivalryEvidence:[]},error:null});});
it("deduplicates details and separates player, metric and season",async()=>{
 await Promise.all([getPerformanceDetail(2026,"performance-rivalry-events","a"),getPerformanceDetail(2026,"performance-rivalry-events","a")]);
 expect(mocks.rpc).toHaveBeenCalledTimes(1);
 await getPerformanceDetail(2027,"performance-rivalry-events","a");await getPerformanceDetail(2026,"performance-rivalry-events","b");await getPerformanceDetail(2026,"performance-chaos-takeovers","a");
 expect(mocks.rpc).toHaveBeenCalledTimes(4);
 expect(mocks.rpc).toHaveBeenNthCalledWith(1,"get_performance_metric_details",{p_season_year:2026,p_metric_key:"performance-rivalry-events",p_player_id:"a"});
});
it("uses existing realtime invalidation including the leaderboard dependency",async()=>{
 await getPerformanceDetail(2026,"performance-rivalry-events","a");invalidateDataGroups(["leaderboard"]);
 await getPerformanceDetail(2026,"performance-rivalry-events","a");expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
it("keeps failures retryable and rejects missing payloads",async()=>{
 mocks.rpc.mockResolvedValueOnce({data:null,error:new Error("offline")});
 await expect(getPerformanceDetail(2026,"performance-rivalry-events","a")).rejects.toThrow("offline");
 await expect(getPerformanceDetail(2026,"performance-rivalry-events","a")).resolves.toMatchObject({rivalryEvidence:[]});
 mocks.rpc.mockResolvedValueOnce({data:null,error:null});
 await expect(getPerformanceDetail("all-time","performance-rivalry-events","a")).rejects.toThrow("Keine Belege");
});
