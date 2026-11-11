import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { MetricRankingCard } from "./MetricRankingCard";
import { EventAttemptList } from "@/components/events/EventAttemptList";
import { formatMetricValue } from "@/utils/statMetricFormat";
import type { RankedMetric } from "@/types/statDashboard";
vi.mock("@/components/common/AwardAssetImage",()=>({AwardAssetImage:({assetId}:{assetId:string})=><span data-asset={assetId} />}));
const metric:RankedMetric={key:"performance-plateau",title:"Plateau",description:"Beschreibung",info:"Erklärung",group:"performance",format:"count",direction:"desc",minimumSample:1,overallValue:null,overallCount:null,overallTotal:null,overallDetail:null,rankings:[{rank:3,playerId:"a",name:"A",avatarUrl:null,value:1.234567,count:null,total:null,detail:null}]};
it("omits meaningless overall boxes and uses tooltip help and actual sporting rank",()=>{
 const html=renderToStaticMarkup(<MetricRankingCard metric={metric} />);
 expect(html).not.toContain(">Gesamt<");expect(html).not.toContain("Wie wird das berechnet?");
 expect(html).toContain('role="tooltip"');expect(html).toContain('aria-expanded="false"');
 expect(html).toContain("Platz 3");expect(html).toContain("1,23");expect(html).not.toContain("1,235");
 expect(renderToStaticMarkup(<MetricRankingCard metric={{...metric,overallValue:0}} />)).toContain(">Gesamt<");
 expect(formatMetricValue(3.141592,"count")).toBe("3,14");
});
it("uses record artwork for every existing event-attempt flag without inventing SR flags",()=>{
 const html=renderToStaticMarkup(<EventAttemptList attempts={[{id:"a",playerId:"p",guestId:null,name:"Player",avatarUrl:null,isGuest:false,isAk:false,timeHundredths:300,isDnf:false,submittedAt:"2026-01-01T18:00Z",attemptNumber:1,rank:1,isPb:true,isWr:true,isEb:true}]} />);
 for(const label of ["Persönliche Bestzeit","Weltrekord","Eventbestzeit"])expect(html).toContain(`aria-label="${label}"`);
 expect(html).not.toContain(">PB<");expect(html).not.toContain(">WR<");expect(html).not.toContain(">EB<");
});
it("places beer ratings before rivalries in profile DOM",()=>{
 const source=readFileSync("src/pages/PlayerProfilePage.tsx","utf8");
 expect(source.indexOf("<PlayerBeerSections")).toBeLessThan(source.indexOf("<PlayerRivalries"));
});
