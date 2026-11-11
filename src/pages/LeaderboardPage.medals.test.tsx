import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
const h=vi.hoisted(()=>({mode:"best",season:2026 as number|"all-time",enabled:vi.fn()}));
vi.mock("@/hooks/useSeason",()=>({useSeason:()=>({season:h.season,isAllTime:h.season==="all-time"})}));
vi.mock("@/hooks/useEffectivePublicData",()=>({useEffectivePublicData:()=>({data:{players:[],leaderboard:[]}})}));
vi.mock("@/hooks/useLeaderboard",()=>({useLeaderboard:()=>({mode:h.mode,setMode:vi.fn(),entries:[]})}));
vi.mock("@/hooks/useHallOfFameMedals",()=>({useHallOfFameMedals:(enabled:boolean)=>{h.enabled(enabled);return {result:{scope:h.season,status:"ready",pending:[],rows:[{playerId:"test-player",name:"Testspieler",avatarUrl:null,rank:1,gold:1,silver:0,bronze:0,total:1,medals:[]}],notes:[],evaluatedCategories:1},retry:vi.fn()};}}));
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
it("shows the selected season medal mode with a populated podium and ranking",()=>{
 h.mode="medals";const html=renderToStaticMarkup(<LeaderboardPage />);
 expect(html).toContain('aria-pressed="true">Medaillenspiegel</button>');
 expect(html).toContain("Saison 2026");
 expect(html).toContain('aria-label="Medaillenpodium"');
 expect(html).toContain('data-medal-podium-rank="1"');
 expect(html).toContain('aria-label="Statistik-Medaillenrangliste"');
 expect(html).toContain('href="/player/test-player"');
 expect(html).toContain("Testspieler");
 expect(html).toContain('aria-label="1 Gold"');
 expect(html).not.toContain("Statistik-Medaillenspiegel");
 expect(html).not.toContain("Olympische Wertung der aktuellen Statistikplatzierungen");
 expect(h.enabled).toHaveBeenCalledWith(true);
});
it("keeps All-Time medals selectable but shows only the future season-awards notice",()=>{
 h.mode="medals";h.season="all-time";const html=renderToStaticMarkup(<LeaderboardPage />);
 expect(html).toContain('aria-pressed="true">Medaillenspiegel</button>');
 expect(html).toContain('aria-label="Ewige Medaillen"');
 expect(html).toContain("Dauerhaft vergebene Saisonmedaillen erscheinen hier nach Einführung des offiziellen Saisonabschlusses.");
 expect(html).not.toContain('aria-label="Medaillenpodium"');
 expect(html).not.toContain('aria-label="Statistik-Medaillenrangliste"');
 expect(html).not.toContain('href="/player/test-player"');
 expect(html).not.toContain("Testspieler");
 expect(html).not.toContain("Olympische Wertung der aktuellen Statistikplatzierungen");
 // The real hook's All-Time no-fetch contract is covered in useHallOfFameMedals.test.ts.
 expect(h.enabled).toHaveBeenCalledWith(true);
});
