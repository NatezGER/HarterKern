import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON } from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";
import { statisticMetricRegistry } from "@/constants/statMetricRegistry";
import type { RankedMetric, RivalryPairSummary, StatisticDashboard, StatisticScope } from "@/types/statDashboard";

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const string = (value: unknown): string | null => typeof value === "string" ? value : null;

function avatarUrl(path: string | null, legacy: string | null) {
  return path ? getSupabase().storage.from("player-avatars").getPublicUrl(path).data.publicUrl : legacy;
}

export function mapStatisticDashboard(value: unknown, scope: StatisticScope): StatisticDashboard | null {
  if (value == null) return null;
  const root = object(value);
  const byKey = new Map(array(root.metrics).map((item) => {
    const row = object(item);
    return [string(row.key), row] as const;
  }));
  const metrics: RankedMetric[] = statisticMetricRegistry.filter((definition) => definition.scopes.includes(scope))
    .map((definition) => {
      const row = byKey.get(definition.key) ?? {};
      return {
        ...definition,
        overallValue: number(row.overallValue),
        overallCount: number(row.overallCount),
        overallTotal: number(row.overallTotal),
        overallDetail: string(row.overallDetail),
        rankings: array(row.rankings).map((item) => {
          const entry = object(item);
          return {
            rank: number(entry.rank) ?? 0,
            playerId: string(entry.playerId) ?? "",
            name: string(entry.name) ?? "Unbekannt",
            avatarUrl: avatarUrl(string(entry.avatarPath), string(entry.avatarUrl)),
            value: number(entry.value) ?? 0,
            count: number(entry.count),
            total: number(entry.total),
            detail: string(entry.detail),
          };
        }),
      };
    });
  const rivalryPairs: RivalryPairSummary[] = array(root.rivalryPairs).map((item) => {
    const pair = object(item);
    return {
      playerLowId: string(pair.playerLowId) ?? "",
      playerHighId: string(pair.playerHighId) ?? "",
      playerLowName: string(pair.playerLowName) ?? "Unbekannt",
      playerHighName: string(pair.playerHighName) ?? "Unbekannt",
      rivalryEvents: number(pair.rivalryEvents) ?? 0,
      directTakeovers: number(pair.directTakeovers) ?? 0,
      levelReached: pair.levelReached === true,
      commonEvents: number(pair.commonEvents) ?? undefined,
      intensityPercent: number(pair.intensityPercent),
      spanDays: number(pair.spanDays),
      balancePercent: number(pair.balancePercent),
    };
  });
  return { scope, metrics, rivalryPairs };
}

export async function getStatisticDashboard(season: SeasonSelection = ALL_TIME_SEASON, eventId?: string) {
  const { data, error } = await getSupabase().rpc("get_unified_statistics_dashboard", {
    p_season_year: season === ALL_TIME_SEASON ? null : season,
    p_event_id: eventId ?? null,
  });
  if (error) throw error;
  return mapStatisticDashboard(data, eventId ? "special-event" : season === ALL_TIME_SEASON ? "all-time" : "season");
}
