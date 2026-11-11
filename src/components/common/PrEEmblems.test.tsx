import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const h=vi.hoisted(()=>({mapping:{} as Record<string,string>}));
vi.mock("@/hooks/useAwardAssets",()=>({useAwardAssetUrl:(id:string)=>h.mapping[id]??null}));
import { PodiumMedal } from "./PodiumMedal";
import { StatisticsMedal } from "./StatisticsMedal";
import { RecordEmblem } from "./RecordEmblem";
beforeEach(()=>{h.mapping={};});
it.each(["wr","sr","pb","eb"] as const)("uses independent %s artwork and restores the labeled fallback after removal",kind=>{
 h.mapping[`record:${kind}`]="https://example.test/custom.webp";
 let html=renderToStaticMarkup(<RecordEmblem kind={kind} />);
 expect(html).toContain("custom.webp");expect(html).toContain("object-contain");
 h.mapping={};html=renderToStaticMarkup(<RecordEmblem kind={kind} />);
 expect(html).not.toContain("<img");expect(html).toContain(kind.toUpperCase());
});
it("keeps statistics and existing event assets separate",()=>{
 h.mapping={"medal:podium:gold":"https://example.test/event.png","medal:statistics:gold":"https://example.test/stat.png"};
 const event=renderToStaticMarkup(<PodiumMedal rank={1} />);const stats=renderToStaticMarkup(<StatisticsMedal rank={1} />);
 expect(event).toContain("event.png");expect(event).not.toContain("stat.png");expect(stats).toContain("stat.png");
 h.mapping={};expect(renderToStaticMarkup(<PodiumMedal rank={1} />)).toContain("<ellipse");
 expect(renderToStaticMarkup(<StatisticsMedal rank={1} />)).not.toContain("<ellipse");
});
