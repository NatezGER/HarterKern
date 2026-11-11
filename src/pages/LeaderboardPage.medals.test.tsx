import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
const h=vi.hoisted(()=>({mode:"best",season:2026 as number|"all-time",enabled:vi.fn()}));
vi.mock("@/hooks/useSeason",()=>({useSeason:()=>({season:h.season,isAllTime:h.season==="all-time"})}));
vi.mock("@/hooks/useEffectivePublicData",()=>({useEffectivePublicData:()=>({data:{players:[],leaderboard:[]}})}));
vi.mock("@/hooks/useLeaderboard",()=>({useLeaderboard:()=>({mode:h.mode,setMode:vi.fn(),entries:[]})}));
vi.mock("@/hooks/useHallOfFameMedals",()=>({useHallOfFameMedals:(enabled:boolean)=>{h.enabled(enabled);return {result:{scope:h.season,status:"ready",pending:[],rows:[],notes:[],evaluatedCategories:0},retry:vi.fn()};}}));
vi.mock("@/components/common/DataState",()=>({DataState:({children}:{children:ReactNode})=>children}));
vi.mock("@/components/common/SeasonContextBadge",()=>({SeasonContextBadge:()=>null}));
vi.mock("@/components/leaderboard/AdvancedHallOfFame",()=>({AdvancedHallOfFame:()=>null}));
import { LeaderboardPage } from "./LeaderboardPage";
beforeEach(()=>{h.mode="best";h.season=2026;vi.clearAllMocks();});
it("shows three controls, default Bestzeit and no medal requests",()=>{
 const html=renderToStaticMarkup(<LeaderboardPage />);
 for(const label of ["Bestzeit","Durchschnitt","Medaillenspiegel"]) expect(html).toContain(label);
 expect(html).toContain('aria-pressed="true">Bestzeit');expect(html).not.toContain("Statistik-Medaillenspiegel");expect(h.enabled).toHaveBeenCalledWith(false);
});
it("retains the average view without requesting medals",()=>{
 h.mode="average";const html=renderToStaticMarkup(<LeaderboardPage />);
 expect(html).toContain("Saison-Durchschnitt 2026");expect(html).not.toContain("Statistik-Medaillenspiegel");expect(h.enabled).toHaveBeenCalledWith(false);
});
it.each([2026,"all-time"] as const)("shows medals only in the selected mode and scope %s",season=>{
 h.mode="medals";h.season=season;const html=renderToStaticMarkup(<LeaderboardPage />);
 expect(html).toContain("Statistik-Medaillenspiegel");expect(html).toContain(season===2026?"Saison 2026":"Ewiger Statistikvergleich");
 expect(h.enabled).toHaveBeenCalledWith(true);expect(html).toContain('aria-label="Medaillenpodium"');
});
