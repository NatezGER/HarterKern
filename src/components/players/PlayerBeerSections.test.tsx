import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlayerBeerSections } from "./PlayerBeerSections";
vi.mock("@/hooks/useMilestoneContent",()=>({useMilestoneContent:()=>({data:{}})}));
it("shows single-attempt brands with existing image fallback and independent total",()=>{
 const html=renderToStaticMarkup(<PlayerBeerSections scope="Saison 2027" data={{validAttempts:5,beers:[{brand:"A",bestHundredths:213,attempts:1,imagePath:null}]}} />);
 expect(html).toContain("Meine schnellsten Biere"); expect(html).toContain("Persönlich getrunken");
 expect(html).toContain("2,13"); expect(html).toContain("1,0 L"); expect(html).toContain("<svg"); expect(html).toContain("Saison 2027");
});
it("renders a compact empty state",()=>{
 const html=renderToStaticMarkup(<PlayerBeerSections scope="Ewig" data={{validAttempts:0,beers:[]}} />);
 expect(html).toContain("Noch keine gültige Zeit"); expect(html).toContain("0,0 L");
});
