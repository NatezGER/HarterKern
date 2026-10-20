import { beforeEach, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BeerStatistics } from "@/types/beerStatistics";
const h = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index=h.cursor++;
    if (!(index in h.values)) h.values[index]=initial;
    return [h.values[index], (value: unknown) => { h.values[index]=value; }];
  },
}));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({
  storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: "https://images.test/"+path } }) }) },
}) }));
import { BeerBottle } from "./BeerBottle";
import { BeerStatisticsContent } from "./BeerStatisticsContent";
type Props = { children?: ReactNode; onError?: () => void; onChange?: (event: { target: { value: string } }) => void };
function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Props>(node)) return [];
  return [node,...nodes(node.props.children)];
}
beforeEach(() => { h.values=[]; h.cursor=0; });
it("falls back for missing/broken images and retries a replacement, using contain not crop", () => {
  h.cursor=0;
  expect(renderToStaticMarkup(BeerBottle({path:null}))).not.toContain("<img");
  h.cursor=0;
  const tree=BeerBottle({path:"bottle.webp"});
  expect(renderToStaticMarkup(tree)).toContain("object-contain");
  nodes(tree).find(node=>node.type==="img")!.props.onError!();
  h.cursor=0;
  expect(renderToStaticMarkup(BeerBottle({path:"bottle.webp"}))).not.toContain("<img");
  h.cursor=0;
  expect(renderToStaticMarkup(BeerBottle({path:"replacement.webp"}))).toContain("replacement.webp");
});
it("switches to single-record and liters categories without changing scope or fetching data", () => {
  const data: BeerStatistics = { season:2026, summary:{attempts:1,brands:0,events:1,people:1,bestBeer:null},
    brands:[],favorites:[],effects:[],variety:[],unlucky:[],
    fastest:[{attemptId:"a",playerId:"p",name:"Single record",brand:"Beer",timeHundredths:230,eventId:"e",eventName:"Event",eventDate:"2026-10-20"}] };
  h.cursor=0;
  const tree=BeerStatisticsContent({data});
  nodes(tree).find(node=>node.type==="select")!.props.onChange!({target:{value:"Schnellste Einzelversuche"}});
  h.cursor=0;
  const html=renderToStaticMarkup(BeerStatisticsContent({data}));
  expect(html).toContain("Single record");
  expect(html).toContain("2,30 s");
  expect(html).toContain("2026-10-20");
  expect(data.season).toBe(2026);
});
