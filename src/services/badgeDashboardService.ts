import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON, type SeasonSelection } from "@/lib/season";
import { mapStatisticDashboard } from "@/services/statDashboardService";

/** Cached once by DataGroup ReadCache, not a second competing service cache. */
export async function getBadgeDashboard(season: SeasonSelection = ALL_TIME_SEASON) {
  const { data, error } = await getSupabase().rpc("get_statistics_badge_dashboard", {
    p_season_year: season === ALL_TIME_SEASON ? null : season,
  });
  if (error) throw error;
  const dashboard = mapStatisticDashboard(data, season === ALL_TIME_SEASON ? "all-time" : "season");
  if (!dashboard) throw new Error("Badge-Statistiken fehlen.");
  dashboard.metrics = dashboard.metrics.filter(({ group }) => group === "bingo" || group === "achievements");
  return { season, dashboard };
}
