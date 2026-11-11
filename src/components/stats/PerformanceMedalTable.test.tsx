import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PerformanceMedalTable } from "./PerformanceMedalTable";
import type { PerformanceMedals } from "@/lib/performanceMedals";
const ready = (): PerformanceMedals => ({scope:2026,status:"ready",pending:[],evaluatedCategories:1,notes:[],rows:[{
  playerId:"p",name:"Sehr langer Spielername",avatarUrl:null,rank:1,gold:1,silver:0,bronze:0,total:1,
  medals:[{key:"fastest",title:"Schnellste Zeit",section:"I. Geschwindigkeit & Bestzeiten",sectionId:"performance-speed",sectionOrder:0,color:"gold",statisticRank:1,value:234,format:"time",scope:2026,count:null,total:null}],
},{playerId:"zero",name:"Ohne Medaille",avatarUrl:null,rank:2,gold:0,silver:0,bronze:0,total:0,medals:[]}]});
it("renders medals, zero players, profile links, accessible details and German values", () => {
 const html=renderToStaticMarkup(<PerformanceMedalTable result={ready()} onRetry={()=>{}} />);
 for(const text of ["Statistik-Medaillenspiegel","Saison 2026","Noch keine endgültig vergebenen Saisonmedaillen","Unter 3,00 Sekunden","mehr als fünf","Negativ- und Spaßstatistiken","2,34","Platz 1","Aktuell keine Statistikmedaillen."]) expect(html).toContain(text);
 expect(html).toContain('href="/player/p"'); expect(html).toContain('href="/stats/performance#performance-speed"');
 expect(html).toContain('aria-label="1 Gold"'); expect(html).toContain('aria-label="0 Silber"');
 expect(html).toContain("<summary"); expect(html).toContain("focus-visible:outline");
 expect(html).toContain("minmax(0,1fr)"); expect(html).toContain("truncate");
 expect(html).not.toContain("Kategorien ohne Medaillenvergabe");
});
it("distinguishes All-Time from career awards and explains excluded categories", () => {
 const result=ready(); result.scope="all-time";
 result.notes=[{key:"smooth",title:"Glatte Zeiten",reason:"too-many",recipients:7},{key:"x",title:"Unsicher",reason:"unsafe",recipients:0}];
 const html=renderToStaticMarkup(<PerformanceMedalTable result={result} onRetry={()=>{}} />);
 expect(html).toContain("Ewiger Statistikvergleich"); expect(html).toContain("keine Summe endgültiger Karriere-Medaillen");
 expect(html).toContain("7 Spieler auf den Podiumsplätzen"); expect(html).toContain("Nicht sicher auswertbar");
});
it.each(["loading","error"] as const)("does not present partial results for %s", status => {
 const result={...ready(),status,pending:["BINGO"]}; const retry=vi.fn();
 const html=renderToStaticMarkup(<PerformanceMedalTable result={result} onRetry={retry} />);
 expect(html).not.toContain('href="/player/p"'); expect(html).toContain("Noch offen: BINGO");
 expect(html).toContain(status==="error" ? 'role="alert"' : 'role="status"');
 if(status==="error") expect(html).toContain("Medaillendaten erneut laden");
});
