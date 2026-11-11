import { beforeEach, expect, it, vi } from "vitest";
import type { MetricRankEntry } from "@/types/statDashboard";
const h=vi.hoisted(()=>({states:[false,0,null] as unknown[],index:0,effect:undefined as undefined|(()=>void|(()=>void)),get:vi.fn(),version:1}));
vi.mock("react",()=>({useState:()=>{const i=h.index++;return [h.states[i],(v:unknown)=>{h.states[i]=typeof v==="function"?v(h.states[i]):v;}];},useEffect:(fn:typeof h.effect)=>{h.effect=fn;},useSyncExternalStore:()=>h.version}));
vi.mock("@/services/performanceDetailService",()=>({getPerformanceDetail:h.get}));
vi.mock("@/services/dataGroupService",()=>({subscribeMedalData:vi.fn(),getMedalDataVersion:vi.fn()}));
import { PerformanceLazyDetails } from "./PerformanceLazyDetails";
const entry={playerId:"a",rank:1,value:2} as MetricRankEntry;
const render=(season=2026)=>{h.index=0;return PerformanceLazyDetails({entry,season,metric:"performance-rivalry-events"});};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
beforeEach(()=>{h.states=[false,0,null];h.version=1;h.get.mockReset();h.get.mockResolvedValue({rivalryEvidence:[]});});
it("loads only on opening and ignores a late response after cleanup",async()=>{
 render();h.effect!();expect(h.get).not.toHaveBeenCalled();
 let resolve!:(v:unknown)=>void;h.get.mockImplementation(()=>new Promise(r=>{resolve=r;}));
 h.states[0]=true;render();const cleanup=h.effect!();expect(h.get).toHaveBeenCalledOnce();
 if(cleanup)cleanup();resolve({rivalryEvidence:[]});await flush();expect(h.states[2]).toBeNull();
 expect(h.get.mock.calls[0][3].aborted).toBe(true);
});
it("reloads open evidence for a changed season or invalidation version",async()=>{
 h.states[0]=true;render();h.effect!();await flush();expect(h.states[2]).toMatchObject({identity:"2026:performance-rivalry-events:a:1"});
 render(2027);h.effect!();await flush();expect(h.get.mock.calls.at(-1)?.[0]).toBe(2027);
 h.version++;render(2027);h.effect!();await flush();expect(h.states[2]).toMatchObject({identity:"2027:performance-rivalry-events:a:2"});
});
