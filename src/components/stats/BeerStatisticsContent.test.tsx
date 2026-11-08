import { beforeEach, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BeerStatistics, BeerBrandStatistic, BeerRankingRow } from "@/types/beerStatistics";
const h = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useId: () => "beer-detail-test",
  useState: (initial: unknown) => {
    const index=h.cursor++;
    if (!(index in h.values)) h.values[index]=initial;
    return [h.values[index], (value: unknown) => { h.values[index]=value; }];
  },
}));
vi.mock("react-router-dom",()=>({Link:({to,children}:{to:string;children:ReactNode})=><a href={to}>{children}</a>}));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({
  storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: "https://images.test/"+path } }) }) },
}) }));
import { BeerBottle } from "./BeerBottle";
import { BeerStatisticsContent } from "./BeerStatisticsContent";
import { BeerBrandDetail } from "./BeerBrandDetail";
type Props = { children?: ReactNode; onError?: () => void; onChange?: (event: { target: { value: string } }) => void;
  onClick?:()=>void; value?:string; beer?:BeerBrandStatistic; "data-beer-ranking"?:boolean; "data-beer-podium"?:boolean;
  "aria-expanded"?:boolean; "aria-controls"?:string; "aria-label"?:string; path?:string; size?:string };
function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Props>(node)) return [];
  return [node,...nodes(node.props.children)];
}
function fixture():BeerStatistics {
  const brands=Array.from({length:12},(_,i):BeerBrandStatistic=>({
    brand:"Beer "+(i+1),imagePath:"bottle"+i+".webp",attempts:12-i,events:1,people:2,
    powerValue:200+i,powerPlayerCount:2,powerQualified:true,powerPlayers:[],fastestPlayers:[],customers:[],turbo:[],brake:[],
    players:[],eventDetails:[{eventId:"event-"+i,name:"Only event "+i,date:"2026-11-08",attempts:12-i}],
    performanceAttempts:2,averageHundredths:250,bestHundredths:180,qualified:true,performancePosition:i+1,
    mostDrinker:{personKey:"p",playerId:"p",name:"Paul",isGuest:false,isAk:false,attempts:2},bestPlayer:null,
  }));
  const power=brands.map((b,i):BeerRankingRow=>({brand:b.brand,rank:i+1,value:200+i,playerCount:2,playerId:null,playerName:null}));
  const record=[...power].reverse().map((r,i)=>({...r,rank:i+1,value:180+i,playerCount:null,playerId:"p",playerName:"Paul"}));
  return {season:2026,brands,summary:{attempts:78,brands:12,events:1,people:2,bestBeer:null},
    rankings:{power,record,volume:power.map(r=>({...r,value:1.2})),turbo:record.map(r=>({...r,value:-20}))},
    fastest:[],favorites:[],effects:[],unlucky:[],variety:[]};
}
const render=(data:BeerStatistics)=>{h.cursor=0;return nodes(BeerStatisticsContent({data}));};
const ranking=(tree:ReactElement<Props>[])=>tree.find(n=>n.props["data-beer-ranking"])!;
const podium=(tree:ReactElement<Props>[])=>tree.find(n=>n.props["data-beer-podium"])!;
beforeEach(() => { h.values=[]; h.cursor=0; });
it("falls back for missing/broken images and retries a replacement, using contain not crop", () => {
  expect(renderToStaticMarkup(BeerBottle({path:null}))).not.toContain("<img");
  h.cursor=0; const tree=BeerBottle({path:"bottle.webp"});
  expect(renderToStaticMarkup(tree)).toContain("object-contain");
  nodes(tree).find(node=>node.type==="img")!.props.onError!();
  h.cursor=0; expect(renderToStaticMarkup(BeerBottle({path:"bottle.webp"}))).not.toContain("<img");
  h.cursor=0; expect(renderToStaticMarkup(BeerBottle({path:"replacement.webp"}))).toContain("replacement.webp");
});
it("defaults to power and displays only real ranks in 2/1/3 order",()=>{
  const data=fixture(), tree=render(data);
  expect(tree.find(n=>n.type==="select")!.props.value).toBe("power");
  const buttons=nodes(podium(tree)).filter(n=>n.type==="button");
  expect(buttons.map(n=>n.key)).toEqual(["Beer 2","Beer 1","Beer 3"]);
  expect(renderToStaticMarkup(podium(tree))).toContain("2/5 Spieler");
  data.rankings.power=data.rankings.power.slice(0,1);
  expect(nodes(podium(render(data))).filter(n=>n.type==="button")).toHaveLength(1);
  data.rankings.power=[];
  expect(nodes(podium(render(data))).filter(n=>n.type==="button")).toHaveLength(0);
});
it("switches podium and list together; single record has one row per brand",()=>{
  const data=fixture(); let tree=render(data);
  tree.find(n=>n.type==="select")!.props.onChange!({target:{value:"record"}});
  tree=render(data);
  expect(nodes(podium(tree)).filter(n=>n.type==="button").map(n=>n.key)).toEqual(["Beer 11","Beer 12","Beer 10"]);
  const rows=nodes(ranking(tree)).filter(n=>n.type==="li");
  expect(rows[0].key).toBe("Beer 12");
  expect(new Set(rows.map(n=>n.key)).size).toBe(rows.length);
  expect(renderToStaticMarkup(podium(tree))).toContain("Paul");
});
it("initially shows ten, expands all and collapses again",()=>{
  const data=fixture();let tree=render(data);
  expect(nodes(ranking(tree)).filter(n=>n.type==="li")).toHaveLength(10);
  tree.find(n=>n.props["aria-expanded"]===false)!.props.onClick!();
  tree=render(data);
  expect(nodes(ranking(tree)).filter(n=>n.type==="li")).toHaveLength(12);
  tree.find(n=>n.props["aria-expanded"]===true)!.props.onClick!();
  expect(nodes(ranking(render(data))).filter(n=>n.type==="li")).toHaveLength(10);
});
it("list, podium and selector select exactly one detail and category changes preserve it",()=>{
  const data=fixture();let tree=render(data);
  nodes(ranking(tree)).filter(n=>n.type==="button")[3].props.onClick!();
  tree=render(data);
  const detail=()=>tree.filter(n=>n.type===BeerBrandDetail);
  expect(detail()).toHaveLength(1); expect(detail()[0].props.beer?.brand).toBe("Beer 4");
  tree.find(n=>n.type==="select")!.props.onChange!({target:{value:"volume"}});
  tree=render(data);expect(detail()[0].props.beer?.brand).toBe("Beer 4");
  nodes(podium(tree)).filter(n=>n.type==="button")[0].props.onClick!();
  tree=render(data);expect(detail()[0].props.beer?.brand).toBe("Beer 2");
  tree.filter(n=>n.type==="select")[1].props.onChange!({target:{value:"Beer 12"}});
  tree=render(data);expect(detail()[0].props.beer?.brand).toBe("Beer 12");
  const html=renderToStaticMarkup(<BeerBrandDetail beer={detail()[0].props.beer!}/>);
  expect(html).toContain("Only event 11");expect(html).not.toContain("Only event 0");
  expect(html).toContain('href="/events/event-11"');
});
it("shares image mapping across podium/list/detail and keeps native accessible controls",()=>{
  const data=fixture(),tree=render(data);
  expect(nodes(podium(tree)).filter(n=>n.type===BeerBottle).map(n=>n.props.path)).toEqual(["bottle1.webp","bottle0.webp","bottle2.webp"]);
  expect(nodes(ranking(tree)).filter(n=>n.type===BeerBottle)[0].props.path).toBe("bottle0.webp");
  expect(tree.find(n=>n.type===BeerBrandDetail)!.props.beer?.imagePath).toBe("bottle0.webp");
  expect(nodes(podium(tree)).filter(n=>n.type==="button").every(n=>n.props["aria-controls"]==="beer-detail-test")).toBe(true);
  const html=renderToStaticMarkup(BeerStatisticsContent({data}));
  expect(html).toContain("min-w-0");expect(html).toContain("[overflow-wrap:anywhere]");
  expect(html).toContain("object-contain");expect(html).not.toContain("object-cover");
  expect(html).toContain("Spieler &amp; Bier");expect(html).not.toContain("<details open");
});
it("falls back to an available brand after scope change without retaining stale details",()=>{
  const data=fixture();let tree=render(data);
  tree.filter(n=>n.type==="select")[1].props.onChange!({target:{value:"Beer 12"}});
  const next={...data,season:2027,brands:data.brands.slice(0,1),rankings:{power:data.rankings.power.slice(0,1),record:[],volume:[],turbo:[]}};
  tree=render(next);
  expect(tree.find(n=>n.type===BeerBrandDetail)!.props.beer?.brand).toBe("Beer 1");
});
