import { beforeEach, expect, it, vi } from "vitest";
import type { PerformanceDashboard } from "@/services/performanceDashboardService";
const h=vi.hoisted(()=>({season:2026 as number|"all-time",version:1,state:null as unknown, effect:undefined as undefined|(()=>void|(()=>void)),setter:vi.fn(),get:vi.fn(),load:vi.fn(),invalidate:vi.fn(),refresh:vi.fn(),rosterStatus:"ready"}));
vi.mock("react",()=>({useState:()=>[h.state,h.setter],useEffect:(effect:typeof h.effect)=>{h.effect=effect;},useSyncExternalStore:()=>h.version}));
vi.mock("./useSeason",()=>({useSeason:()=>({season:h.season})}));
vi.mock("./useDataPlatform",()=>({useDataGroup:()=>({status:h.rosterStatus,refresh:h.refresh}),useDataPlatform:()=>({snapshot:{publicData:{players:[]}}})}));
vi.mock("@/services/performanceDashboardService",()=>({getPerformanceDashboard:h.get}));
vi.mock("@/services/dataGroupService",()=>({loadDataGroup:h.load,invalidateDataGroups:h.invalidate,subscribeMedalData:vi.fn(),getMedalDataVersion:()=>h.version}));
import { useHallOfFameMedals } from "./useHallOfFameMedals";
const data=()=>({season:h.season,dashboard:{metrics:[]}} as unknown as PerformanceDashboard);
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
beforeEach(()=>{vi.clearAllMocks();h.state=null;h.season=2026;h.version=1;h.rosterStatus="ready";h.get.mockResolvedValue(data());h.load.mockResolvedValue({publicData:{badgeStatistics:data()}});h.refresh.mockResolvedValue(undefined);});
it("does not request medals in Bestzeit or Durchschnitt",()=>{
 useHallOfFameMedals(false);h.effect!();expect(h.get).not.toHaveBeenCalled();expect(h.load).not.toHaveBeenCalled();
});
it("loads both complete sources in parallel using the existing BINGO cache boundary",async()=>{
 useHallOfFameMedals(true);h.effect!();await flush();
 expect(h.get).toHaveBeenCalledExactlyOnceWith(2026,expect.any(AbortSignal));
 expect(h.load).toHaveBeenCalledExactlyOnceWith("badge-statistics",2026,expect.any(AbortSignal));
 expect(h.setter).toHaveBeenLastCalledWith(expect.objectContaining({season:2026,status:"ready"}));
});
it("hides stale season and invalidation generation before effects",()=>{
 h.state={season:2026,version:1,status:"ready",performance:data(),bingo:data()};
 expect(useHallOfFameMedals(true).result.status).toBe("ready");
 h.season="all-time";expect(useHallOfFameMedals(true).result.status).toBe("loading");
 h.season=2026;h.version=2;expect(useHallOfFameMedals(true).result.status).toBe("loading");
});
it("ignores late responses after switching season or mode",async()=>{
 let resolve!:(value:PerformanceDashboard)=>void;h.get.mockImplementation(()=>new Promise(r=>{resolve=r;}));
 useHallOfFameMedals(true);const cleanup=h.effect!();if(cleanup)cleanup();h.setter.mockClear();resolve(data());await flush();
 expect(h.setter).not.toHaveBeenCalled();expect(h.get.mock.calls[0][1].aborted).toBe(true);
});
it("never shows partial data and retries all failed sources",async()=>{
 h.load.mockRejectedValue(new Error("offline"));useHallOfFameMedals(true);h.effect!();await flush();
 expect(h.setter).toHaveBeenLastCalledWith({season:2026,version:1,status:"error"});
 h.state={season:2026,version:1,status:"error"};h.rosterStatus="error";
 const hook=useHallOfFameMedals(true);expect(hook.result.rows).toEqual([]);hook.retry();
 expect(h.invalidate).toHaveBeenCalledWith(["performance","badge-statistics"]);expect(h.refresh).toHaveBeenCalledOnce();
});
