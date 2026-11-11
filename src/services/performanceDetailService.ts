import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON, type SeasonSelection } from "@/lib/season";
import { ReadCache, statisticReadKey } from "./readCache";
import { parseChaosEvidence, parseRivalryEvidence } from "./performanceEvidence";
import { parseDevelopmentEvidence } from "./performanceDevelopmentEvidence";
import type { MetricRankEntry } from "@/types/statDashboard";
export type PerformanceDetail = Pick<MetricRankEntry, "chaosEvidence" | "rivalryEvidence" | "developmentEvidence">;
export const performanceDetailCache = new ReadCache<PerformanceDetail>();
export function getPerformanceDetail(season: SeasonSelection, metric: string, playerId: string, signal?: AbortSignal) {
  return performanceDetailCache.read(statisticReadKey(`performance-detail:${metric}:${playerId}`, season), async () => {
    const { data, error } = await getSupabase().rpc("get_performance_metric_details", {
      p_season_year: season === ALL_TIME_SEASON ? null : season, p_metric_key: metric, p_player_id: playerId,
    });
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Keine Belege verfügbar.");
    return { chaosEvidence: parseChaosEvidence(data.chaosEvidence), rivalryEvidence: parseRivalryEvidence(data.rivalryEvidence), developmentEvidence: parseDevelopmentEvidence(data.developmentEvidence) };
  }, signal);
}
