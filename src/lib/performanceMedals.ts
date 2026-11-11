import type { Player } from "@/types";
import type { MetricFormat, RankedMetric } from "@/types/statDashboard";
import type { SeasonSelection } from "@/lib/season";
import { performanceMedalCategories, performanceMedalEligibility, type MedalEligibility } from "@/constants/performanceMedalEligibility";

export type MedalColor = "gold" | "silver" | "bronze";
export type MedalLoadStatus = "idle" | "loading" | "ready" | "error";
export interface MedalSource {
  season?: SeasonSelection; metrics: RankedMetric[]; status: MedalLoadStatus;
  // Verified server contract, never the UI's sliced top five.
  coverage: "top10" | "unknown";
}
export type MedalPlayer = Pick<Player, "id" | "name" | "avatarUrl" | "isAk" | "isArchived">;
export interface StatisticMedal {
  key: string; title: string; section: string; sectionId: string; sectionOrder: number;
  color: MedalColor; statisticRank: number; value: number; format: MetricFormat;
  scope: SeasonSelection; count: number | null; total: number | null;
}
export interface MedalTableRow {
  playerId: string; name: string; avatarUrl: string | null; gold: number; silver: number; bronze: number;
  total: number; rank: number; medals: StatisticMedal[];
}
export interface MedalCategoryNote { key: string; title: string; reason: "empty" | "too-many" | "disabled" | "unsafe"; recipients: number }
export interface PerformanceMedals {
  scope: SeasonSelection; status: "ready" | "loading" | "error"; pending: string[];
  rows: MedalTableRow[]; evaluatedCategories: number; notes: MedalCategoryNote[];
}
const colorOrder: Record<MedalColor, number> = { gold: 0, silver: 1, bronze: 2 };
const nameOrder = (a: string, b: string) => a.localeCompare(b, "de");

export function calculatePerformanceMedals(input: {
  scope: SeasonSelection; performance: MedalSource; bingo: MedalSource;
  players: MedalPlayer[]; playersStatus: MedalLoadStatus; eligibility?: MedalEligibility;
}): PerformanceMedals {
  const { scope, performance, bingo, playersStatus } = input;
  const pending = [performance.status !== "ready" || performance.season !== scope ? "Performance" : "",
    bingo.status !== "ready" || bingo.season !== scope ? "BINGO" : "", playersStatus !== "ready" ? "Spielerregister" : ""].filter(Boolean);
  const result: PerformanceMedals = { scope, status: pending.length ? [performance.status,bingo.status,playersStatus].includes("error") ? "error" : "loading" : "ready",
    pending, rows: [], evaluatedCategories: 0, notes: [] };
  // Never combine a previous season or present a partial tally as a complete table.
  if (pending.length) return result;
  const players = new Map(input.players.filter(p => !p.isAk && !p.isArchived).map(p => [p.id, p]));
  const rows = new Map<string, MedalTableRow>([...players.values()].map(p => [p.id, {
    playerId:p.id,name:p.name,avatarUrl:p.avatarUrl,gold:0,silver:0,bronze:0,total:0,rank:0,medals:[],
  }]));
  for (const category of performanceMedalCategories(performance.metrics, bingo.metrics, input.eligibility ?? performanceMedalEligibility)) {
    const { metric } = category;
    const note = (reason: MedalCategoryNote["reason"], recipients = 0) => result.notes.push({key:metric.key,title:metric.title,reason,recipients});
    if (!category.enabled) { note("disabled"); continue; }
    const source = category.source === "performance" ? performance : bingo;
    if (source.coverage !== "top10") { note("unsafe"); continue; }
    const distinct = new Map<string, RankedMetric["rankings"][number]>();
    let unsafe = false;
    for (const entry of metric.rankings) {
      if (!players.has(entry.playerId)) continue;
      if (!Number.isInteger(entry.rank) || entry.rank < 1 || !Number.isFinite(entry.value)) { unsafe = true; break; }
      const prior = distinct.get(entry.playerId);
      if (prior && (prior.rank !== entry.rank || prior.value !== entry.value)) { unsafe = true; break; }
      distinct.set(entry.playerId, entry);
    }
    if (unsafe) { note("unsafe"); continue; }
    const podium = [...distinct.values()].filter(entry => entry.rank <= 3);
    if (podium.length > 5) { note("too-many", podium.length); continue; }
    if (!podium.length) { note("empty"); continue; }
    result.evaluatedCategories++;
    for (const entry of podium) {
      const color: MedalColor = entry.rank === 1 ? "gold" : entry.rank === 2 ? "silver" : "bronze";
      const row = rows.get(entry.playerId)!;
      row[color]++; row.total++;
      row.medals.push({ key:metric.key,title:metric.title,section:category.section,sectionId:category.sectionId,
        sectionOrder:category.order,color,statisticRank:entry.rank,value:entry.value,format:metric.format,
        scope,count:entry.count,total:entry.total });
    }
  }
  result.rows = [...rows.values()].sort((a,b) => b.gold-a.gold || b.silver-a.silver || b.bronze-a.bronze || nameOrder(a.name,b.name) || a.playerId.localeCompare(b.playerId));
  result.rows.forEach((row,i) => {
    const prior = result.rows[i-1];
    row.rank = prior && prior.gold===row.gold && prior.silver===row.silver && prior.bronze===row.bronze ? prior.rank : i+1;
    row.medals.sort((a,b) => colorOrder[a.color]-colorOrder[b.color] || a.sectionOrder-b.sectionOrder || nameOrder(a.title,b.title) || a.key.localeCompare(b.key));
  });
  return result;
}
