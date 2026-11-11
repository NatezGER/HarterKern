import { beforeEach, expect, it, vi } from "vitest";
import type { PerformanceDashboard } from "@/services/performanceDashboardService";
const h=vi.hoisted(()=>({state:{season:"all-time" as string|number,refreshVersion:1,data:{} as PerformanceDashboard,loading:false,error:""},index:0,
 setter:vi.fn(),retry:vi.fn(),get:vi.fn(),effect:undefined as undefined|(()=>undefined|(()=>void))}));
vi.mock("react",()=>({useState:()=>h.index++===0?[0,h.retry]:[h.state,h.setter],useEffect:(effect:typeof h.effect)=>{h.effect=effect;}}));
vi.mock("@/services/performanceDashboardService",()=>({getPerformanceDashboard:h.get}));
import { usePerformanceDashboard } from "./usePerformanceDashboard";
beforeEach(()=>{vi.clearAllMocks();h.index=0;h.state={season:"all-time",refreshVersion:1,data:{} as PerformanceDashboard,loading:false,error:""};});
it("hides earlier-season data before the effect executes",()=>{expect(usePerformanceDashboard(2026,1).data).toBeNull();});
it("hides the previous refresh generation immediately after invalidation",()=>{const value=usePerformanceDashboard("all-time",2);expect(value.data).toBeNull();expect(value.loading).toBe(true);});
it("retains the resolved matching scope and generation",()=>{expect(usePerformanceDashboard("all-time",1).data).toBe(h.state.data);});
it("ignores late responses after cleanup",async()=>{
 let resolve!: (value:PerformanceDashboard)=>void;h.get.mockImplementation(()=>new Promise(r=>{resolve=r;}));
 usePerformanceDashboard("all-time",1); const cleanup=h.effect!();cleanup!();h.setter.mockClear();resolve(h.state.data);await Promise.resolve();
 expect(h.setter).not.toHaveBeenCalled(); expect((h.get.mock.calls[0][1] as AbortSignal).aborted).toBe(true);
});
