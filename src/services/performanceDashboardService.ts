import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON, type SeasonSelection } from "@/lib/season";
import { mapStatisticDashboard } from "@/services/statDashboardService";
import { ReadCache, statisticReadKey } from "@/services/readCache";
import { statisticMetricRegistry, type StatisticMetricDefinition } from "@/constants/statMetricRegistry";
import type { FiveWindowEvidence } from "@/types/statDashboard";
import type { StatisticDashboard } from "@/types/statDashboard";
import type { AttemptNumberPoint } from "@/types/historyProfiles";
import type { Player, Statistic } from "@/types";

const hunterDefinition: StatisticMetricDefinition = {
  key: "most-wanted-firsts", title: "Most-Wanted Top-Hunter",
  description: "Unterschiedliche kanonische Ersttreffer im gewählten Scope",
  info: "Jede Hundertstel-Endung zählt genau für ihren ersten Einsammler. Wiederholungen zählen nicht erneut; Ersttreffer von Gästen werden keinem Spieler zugeschrieben.",
  format: "count", direction: "desc", minimumSample: 1, group: "bingo", scopes: ["all-time", "season"],
};

function windowEvidence(value: unknown, rankingValue: number): FiveWindowEvidence | undefined {
  if (!value || typeof value !== "object") return;
  const v = value as FiveWindowEvidence;
  if (typeof v.eventId !== "string" || typeof v.eventName !== "string" || typeof v.eventDate !== "string"
    || !Number.isInteger(v.startAttempt) || v.startAttempt < 1 || v.endAttempt !== v.startAttempt + 4
    || !Array.isArray(v.times) || v.times.length !== 5 || !v.times.every(t => Number.isInteger(t) && t > 0)
    || !Array.isArray(v.attemptIds) || v.attemptIds.length !== 5 || !v.attemptIds.every(id => typeof id === "string")
    || v.averageHundredths !== rankingValue) return;
  return v;
}

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
    const dashboard = mapStatisticDashboard(data, season === ALL_TIME_SEASON ? "all-time" : "season", [...statisticMetricRegistry, hunterDefinition])!;
    dashboard.metrics = dashboard.metrics.filter(({ group, key }) =>
      key === "most-wanted-firsts" || ["performance", "consistency", "volume", "event", "records"].includes(group));
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
      if (metric.key === "dnf") return { ...metric, minimumSample: 10, description: "Mindestens 10 offizielle Eventversuche; DNF / Versuche" };
      if (metric.key === "near-repeat") return { ...metric, description: "Direkte gültige Nachbarpaare mit höchstens 0,10 s Abstand", info: "Treffer / gültige Nachbarpaare; mindestens fünf Paare. Gleiche Zeiten zählen mit. DNF und Eventgrenzen unterbrechen die Folge." };
      if (metric.key.startsWith("wr-") && season !== ALL_TIME_SEASON) return { ...metric, title: metric.title.replace(/WR/g, "SR") };
      if (metric.key === "best-five-window") {
        const raw = (data.metrics as { key: string; rankings?: { playerId: string; windowEvidence?: unknown }[] }[] | undefined)
          ?.find(m => m.key === metric.key);
        return { ...metric, rankings: metric.rankings.map(entry => ({ ...entry,
          windowEvidence: windowEvidence(raw?.rankings?.find(r => r.playerId === entry.playerId)?.windowEvidence, entry.value),
        })) };
      }
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
