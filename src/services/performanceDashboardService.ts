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
    // These definitions belong to the isolated event-performance RPC.
    // Legacy Compare/Trophy payloads keep their existing registry semantics.
    dashboard.metrics = dashboard.metrics.map((metric) => {
      if (["sub5", "sub4", "sub3", "sub25", "sub2"].includes(metric.key)) {
        return { ...metric, description: "Anteil gültiger Eventzeiten",
          info: "Nur reguläre Spieler; ohne DNF, AK, Gäste und historische Zeiten. Gleiche Quote bedeutet gleichen Rang; die größere Stichprobe steht zuerst." };
      }
      if (metric.key === "event-max") return { ...metric,
        title: "Meiste gültige Versuche in einem Event",
        description: "Persönlicher Event-Höchstwert ohne DNF, AK und Gäste" };
      if (metric.key === "common") return { ...metric, overallFormat: "count" as const,
        title: "Meiste Zeitwiederholungen",
        description: "Häufigkeit der eigenen häufigsten exakten Eventzeit",
        info: "Nur gültige reguläre Eventzeiten. Bei gleich häufigen Zeiten wird die schnellere als Beispiel angezeigt." };
      return metric;
    });
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
