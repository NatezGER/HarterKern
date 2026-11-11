import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import type { RankedMetric } from "@/types/statDashboard";
const h=vi.hoisted(()=>({season:2026 as number|"all-time",bingoSeason:2026 as number|"all-time",bingoStatus:"ready",playerStatus:"ready",loading:false,error:"",retry:vi.fn(),refresh:vi.fn(),metrics:[] as RankedMetric[]}));
vi.mock("@/hooks/useSeason",()=>({useSeason:()=>({season:h.season,isAllTime:h.season==="all-time"})}));
vi.mock("@/hooks/usePerformanceDashboard",()=>({usePerformanceDashboard:()=>({data:{season:h.season,dashboard:{metrics:h.metrics},statistics:[]},loading:h.loading,error:h.error,retry:h.retry})}));
vi.mock("@/hooks/useDataPlatform",()=>({
 useDataGroup:(group:string)=>({version:1,status:group==="badge-statistics"?h.bingoStatus:group==="players"?h.playerStatus:"ready",refresh:h.refresh}),
 useDataPlatform:()=>({snapshot:{publicData:{players:[{id:"p",name:"Paul",avatarUrl:null,isAk:false,isArchived:false},{id:"z",name:"Zero",avatarUrl:null,isAk:false,isArchived:false}],badgeStatistics:{season:h.bingoSeason,dashboard:{metrics:[]}}},liveState:{historicalAttempts:[]}}}),
}));
vi.mock("@/components/common/DataState",()=>({DataState:({children}:{children:ReactNode})=>children}));
vi.mock("@/components/stats/StatsHeader",()=>({StatsHeader:()=>null}));
vi.mock("@/components/stats/StatsNavigation",()=>({StatsNavigation:()=>null}));
vi.mock("@/components/stats/BadgeRankingSections",()=>({BadgeRankingSections:()=>null}));
vi.mock("@/components/history/HistoricalAttemptsDisclosure",()=>({HistoricalAttemptsDisclosure:()=>null}));
import { StatsPage } from "./StatsPage";
beforeEach(()=>{h.season=2026;h.bingoSeason=2026;h.bingoStatus="ready";h.playerStatus="ready";h.loading=false;h.error="";
 h.metrics=[{key:"fastest",title:"Schnellste Zeit",description:"",format:"time",direction:"asc",group:"performance",minimumSample:1,overallValue:null,overallCount:null,overallTotal:null,overallDetail:null,rankings:[{rank:1,playerId:"p",name:"Paul",avatarUrl:null,value:234,count:null,total:null,detail:null}]}];});
it("keeps rankings and BINGO on Performance without the moved medal table",()=>{
 const html=renderToStaticMarkup(<StatsPage />);
 expect(html).not.toContain("Statistik-Medaillenspiegel");
 expect(html).toContain('data-metric-key="fastest"');
 expect(html).toContain('id="performance-bingo"');
});
it("does not depend on medal roster or bingo source status to render Performance",()=>{
 h.bingoSeason="all-time";h.playerStatus="error";
 const html=renderToStaticMarkup(<StatsPage />);
 expect(html).not.toContain("Medaillendaten erneut laden");
 expect(html).toContain('data-metric-key="fastest"');
});
it("retains ordinary performance loading and error recovery",()=>{
 h.loading=true;
 expect(renderToStaticMarkup(<StatsPage />)).toContain("Ranking-Statistiken werden geladen");
 h.loading=false;h.error="offline";
 expect(renderToStaticMarkup(<StatsPage />)).toContain("Bereich neu laden");
});
