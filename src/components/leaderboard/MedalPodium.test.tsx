import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MedalPodium } from "./MedalPodium";
import type { PerformanceMedals } from "@/lib/performanceMedals";
const row=(id:string,rank:number,total=1):PerformanceMedals["rows"][number]=>({playerId:id,name:id,avatarUrl:null,rank,gold:total,silver:0,bronze:0,total,medals:[]});
it("preserves shared competition ranks and limits the podium to three",()=>{
 const html=renderToStaticMarkup(<MedalPodium rows={[row("a",1),row("b",1),row("c",3),row("d",3)]} />);
 expect(html.match(/data-medal-podium-rank="1"/g)).toHaveLength(2);
 expect(html).not.toContain('data-medal-podium-rank="2"');
 expect(html.match(/data-medal-podium-rank=/g)).toHaveLength(3);
 expect(html).toContain("Weitere gleichplatzierte Spieler");
 expect(html).not.toContain('href="/player/d"');
});
it.each([0,1,2])("supports %s players without invented places",count=>{
 const html=renderToStaticMarkup(<MedalPodium rows={Array.from({length:count},(_,i)=>row(String(i),i+1))} />);
 expect(html.match(/data-medal-podium-rank=/g)??[]).toHaveLength(count);
});
it("keeps zero-medal players off the podium",()=>{
 expect(renderToStaticMarkup(<MedalPodium rows={[row("zero",1,0)]} />)).toContain("Noch keine Statistikmedaillen");
});
