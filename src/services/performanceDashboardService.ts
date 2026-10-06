import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON, type SeasonSelection } from "@/lib/season";
import { mapStatisticDashboard } from "@/services/statDashboardService";
import { ReadCache, statisticReadKey } from "@/services/readCache";
import type { StatisticDashboard } from "@/types/statDashboard";
import type { AttemptNumberPoint } from "@/types/historyProfiles";
import type { Player, Statistic } from "@/types";

export interface PerformanceDashboard {
  season: SeasonSelection;
  dashboard: StatisticDashboard;
  attemptNumbers: AttemptNumberPoint[];
  players: Pick<Player, "id" | "name" | "avatarUrl">[];
  statistics: Statistic[];
}
export const performanceDashboardCache = new ReadCache<PerformanceDashboard>();
export function getPerformanceDashboard(season: SeasonSelection = ALL_TIME_SEASON, signal?: AbortSignal) {
  return performanceDashboardCache.read(statisticReadKey("performance", season), async () => {
    const { data, error } = await getSupabase().rpc("get_statistics_performance_dashboard", {
      p_season_year: season === ALL_TIME_SEASON ? null : season,
    });
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Performance-Payload fehlt.");
    const dashboard = mapStatisticDashboard(data, season === ALL_TIME_SEASON ? "all-time" : "season")!;
    dashboard.metrics = dashboard.metrics.filter(({ group }) =>
      ["performance", "consistency", "volume", "event", "records"].includes(group));
    const records = (value: unknown): Record<string, unknown>[] =>
      Array.isArray(value) ? value.filter((row) => row && typeof row === "object") : [];
    return {
      season, dashboard,
      attemptNumbers: records(data.attemptNumbers).map((point) => ({
        attemptNumber: Number(point.attemptNumber), samples: Number(point.samples),
        validAttempts: Number(point.validCount), dnfCount: Number(point.dnfCount),
        averageHundredths: point.averageHundredths == null ? null : Number(point.averageHundredths),
      })),
      players: records(data.players).map((player) => ({
        id: String(player.id), name: String(player.name),
        avatarUrl: player.avatarPath ? getSupabase().storage.from("player-avatars")
          .getPublicUrl(String(player.avatarPath)).data.publicUrl : player.avatarUrl as string | null,
      })),
      statistics: [
        { id: "players", label: "Reguläre Spieler", value: String(data.regularPlayers ?? 0), change: "Gäste ausgeschlossen", icon: "users" },
        { id: "events", label: "Events", value: String(data.eventCount ?? 0), change: "Abgeschlossene Abende", icon: "trophy" },
      ],
    };
  }, signal);
}
