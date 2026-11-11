import { describe, expect, it } from "vitest";
import { calculatePerformanceMedals, type MedalPlayer, type MedalSource } from "./performanceMedals";
import { performanceMedalCategories } from "@/constants/performanceMedalEligibility";
import { performanceSections } from "@/constants/performanceSections";
import { statisticMetricRegistry } from "@/constants/statMetricRegistry";
import { performanceEventMetrics } from "@/constants/performanceEventMetrics";
import { performanceDevelopmentMetrics } from "@/constants/performanceDevelopmentMetrics";
import type { RankedMetric } from "@/types/statDashboard";

export const medalPlayers: MedalPlayer[] = Array.from({length:12},(_,i) => ({id:String(i),name:`Player ${i}`,avatarUrl:null,isAk:false,isArchived:false}));
export function medalMetric(key: string, ranks: number[], ids = ranks.map((_,i) => String(i))): RankedMetric {
  return {key,title:key,description:"",group:key.startsWith("bingo") || key==="rare-hunter" ? "bingo" : "performance",format:"count",direction:"desc",minimumSample:1,
    overallValue:null,overallCount:null,overallTotal:null,overallDetail:null,
    rankings:ranks.map((rank,i) => ({rank,playerId:ids[i],name:ids[i],avatarUrl:null,value:10,count:null,total:null,detail:null}))};
}
const source = (metrics: RankedMetric[]): MedalSource => ({season:2026,status:"ready",coverage:"top10",metrics});
export const medalInput = (metrics: RankedMetric[]) => ({scope:2026 as const,performance:source(metrics),bingo:source([]),players:medalPlayers,playersStatus:"ready" as const});
const tally = (ranks: number[]) => calculatePerformanceMedals(medalInput([medalMetric("fastest",ranks)]));

describe("podium medals", () => {
  it.each([
    [[1,2,3],[1,1,1]], [[1,1,3],[2,0,1]], [[1,1,1,4],[3,0,0]],
    [[1,2,3,3,3],[1,1,3]], [[1,1,1,1,1],[5,0,0]], [[1],[1,0,0]], [[1,2],[1,1,0]], [[1,1],[2,0,0]],
  ])("uses server ranks %j", (ranks,expected) => {
    const result=tally(ranks);
    expect(["gold","silver","bronze"].map(c => result.rows.reduce((n,r) => n+r[c as "gold"|"silver"|"bronze"],0))).toEqual(expected);
  });
  it.each([[1,1,1,1,1,1],[1,2,3,3,3,3],[1,1,1,1,1,1,1,1,1,1]])("excludes the entire oversized podium %j", (...ranks) => {
    const result=tally(ranks);
    expect(result.rows.every(r => r.total===0)).toBe(true);
    expect(result.notes[0]).toMatchObject({reason:"too-many",recipients:ranks.length});
  });
  it("does not award array positions or rank 4+", () => {
    const result=tally([3,1,4,2]);
    expect(result.rows.find(r => r.playerId==="0")?.bronze).toBe(1);
    expect(result.rows.find(r => r.playerId==="1")?.gold).toBe(1);
    expect(result.rows.find(r => r.playerId==="2")?.total).toBe(0);
  });
  it("reports empty and unsafe rankings instead of inventing results", () => {
    expect(tally([]).notes[0].reason).toBe("empty");
    for (const rank of [0,-1,1.5,NaN,Infinity]) expect(tally([rank,1]).notes[0].reason).toBe("unsafe");
    const input=medalInput([medalMetric("fastest",[1])]); input.performance.coverage="unknown";
    expect(calculatePerformanceMedals(input).notes[0].reason).toBe("unsafe");
  });
  it("deduplicates a player/key, rejects conflicting duplicates, and retains different tied players", () => {
    const metric=medalMetric("fastest",[1,1,1],["0","0","1"]);
    const result=calculatePerformanceMedals(medalInput([metric,metric]));
    expect(result.rows[0].gold).toBe(1); expect(result.rows[1].gold).toBe(1);
    metric.rankings[1].rank=2;
    expect(calculatePerformanceMedals(medalInput([metric])).notes[0].reason).toBe("unsafe");
  });
  it("keeps zero players while excluding AK, archived and unknown guest IDs", () => {
    const input=medalInput([medalMetric("fastest",[1,2,3],["0","1","guest"])]);
    input.players=medalPlayers.map(p => ({...p,isAk:p.id==="0",isArchived:p.id==="1"}));
    const result=calculatePerformanceMedals(input);
    expect(result.rows).toHaveLength(10); expect(result.rows.every(r => r.total===0)).toBe(true);
  });
});

describe("composition and eligibility", () => {
  it("derives visible categories from the same composition and bingo group, never legacy keys", () => {
    const definitions=[...statisticMetricRegistry,...performanceEventMetrics,...performanceDevelopmentMetrics];
    const metrics=definitions.map(d => ({...medalMetric(d.key,[1]),...d}));
    const bingo=metrics.filter(m => m.group==="bingo" && definitions.find(d => d.key===m.key)?.scopes.includes("season"));
    const categories=performanceMedalCategories([...metrics,medalMetric("most-wanted-firsts",[1])],bingo);
    const keys=categories.map(c=>c.metric.key);
    for (const section of performanceSections) for (const key of section.keys) expect(keys).toContain(key==="thresholds" ? "sub3" : key);
    for(const key of ["bingo-lines","bingo-fields","rare-hunter","most-wanted-firsts"]) expect(keys.filter(k=>k===key)).toHaveLength(1);
    for(const key of ["sub5","sub4","sub25","sub2","one-shot","clutch","late-bloomer","event-breaks","chaos-magnet","badge-total"]) expect(keys).not.toContain(key);
    for(const key of ["performance-downward-spiral","performance-form-decay","performance-plateau","performance-near-legend"]) expect(keys).toContain(key);
  });
  it("counts fixed sub3 independently of display order and permits central exclusions", () => {
    const metrics=[medalMetric("sub5",[1],["0"]),medalMetric("sub3",[1],["1"]),medalMetric("sub2",[1],["2"])];
    const input=medalInput(metrics);
    expect(calculatePerformanceMedals(input).rows[0].playerId).toBe("1");
    expect(calculatePerformanceMedals({...input,performance:source([...metrics].reverse())}).rows).toEqual(calculatePerformanceMedals(input).rows);
    const changed=calculatePerformanceMedals({...input,eligibility:{thresholdKey:"sub2",excludedKeys:[]}});
    expect(changed.rows[0].playerId).toBe("2");
    expect(calculatePerformanceMedals({...input,eligibility:{thresholdKey:"sub3",excludedKeys:["sub3"]}}).notes[0].reason).toBe("disabled");
  });
});

describe("table ordering and source lifecycle", () => {
  it("sorts lexicographically rather than by total and uses competition ties", () => {
    const metrics=[medalMetric("fastest",[1],["0"]),medalMetric("average",[2,2],["1","2"]),medalMetric("median",[3,3],["1","2"])];
    const input=medalInput(metrics); input.players=medalPlayers.map(p=>({...p,name:p.id==="1" ? "Zoe" : p.id==="2" ? "Anna" : p.name}));
    const rows=calculatePerformanceMedals(input).rows;
    expect(rows.slice(0,3).map(r=>[r.playerId,r.rank,r.total])).toEqual([["0",1,1],["2",2,2],["1",2,2]]);
    expect(rows[3].rank).toBe(4);
  });
  it("silver then bronze break ties, and names never change sporting rank", () => {
    const rows=calculatePerformanceMedals(medalInput([
      medalMetric("fastest",[1,1,1]),medalMetric("average",[2,2],["1","2"]),medalMetric("median",[3],["2"]),
    ])).rows;
    expect(rows.slice(0,3).map(r=>r.playerId)).toEqual(["2","1","0"]);
    expect(tally([1,1,3]).rows.slice(0,3).map(r=>r.rank)).toEqual([1,1,3]);
  });
  it("never mixes years and waits for bingo and roster, then recomputes on refreshed rankings", () => {
    const input=medalInput([medalMetric("fastest",[1],["0"])]);
    for(const season of [2025,"all-time"] as const) expect(calculatePerformanceMedals({...input,bingo:{...input.bingo,season}}).rows).toEqual([]);
    expect(calculatePerformanceMedals({...input,bingo:{...input.bingo,status:"loading"}}).status).toBe("loading");
    expect(calculatePerformanceMedals({...input,bingo:{...input.bingo,status:"error"}}).status).toBe("error");
    expect(calculatePerformanceMedals({...input,playersStatus:"loading"}).rows).toEqual([]);
    const complete=calculatePerformanceMedals({...input,bingo:source([medalMetric("bingo-fields",[1],["1"])])});
    expect(complete.rows.filter(r=>r.gold===1)).toHaveLength(2);
    expect(calculatePerformanceMedals({...input,performance:source([medalMetric("fastest",[1],["2"])])}).rows[0].playerId).toBe("2");
    expect(calculatePerformanceMedals({...input,scope:"all-time",performance:{...input.performance,season:"all-time"},bingo:{...input.bingo,season:"all-time"}}).rows[0].medals[0].scope).toBe("all-time");
  });
});
