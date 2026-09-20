import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON } from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";
import type { MetricFormat, RankedMetric, RivalryPairSummary, StatisticDashboard, StatisticScope } from "@/types/statDashboard";

interface MetricDefinition {
  key: string;
  title: string;
  description: string;
  format: MetricFormat;
  overallFormat?: MetricFormat;
  direction: "asc" | "desc";
  minimumSample: number;
}

const definitions: MetricDefinition[] = [
  { key: "fastest", title: "Schnellste Zeit", description: "Persönliche Bestzeiten", format: "time", direction: "asc", minimumSample: 1 },
  { key: "valid", title: "Gültige Eventversuche", description: "Reguläre offizielle Eventzeiten", format: "count", direction: "desc", minimumSample: 1 },
  { key: "average", title: "Bester Durchschnitt", description: "Mindestens 3 gültige Eventversuche", format: "time", direction: "asc", minimumSample: 3 },
  { key: "dnf", title: "Niedrigste DNF-Quote", description: "Mindestens 5 Eventversuche", format: "percent", direction: "asc", minimumSample: 5 },
  ...([ ["sub5", "Unter 5 Sekunden"], ["sub4", "Unter 4 Sekunden"], ["sub3", "Unter 3 Sekunden"], ["sub25", "Unter 2,5 Sekunden"], ["sub2", "Unter 2 Sekunden"] ] as const)
    .map(([key, title]) => ({ key, title, description: "Anteil gültiger offizieller Zeiten", format: "percent" as const, direction: "desc" as const, minimumSample: 1 })),
  { key: "streak", title: "Längste Serie unter 3 Sekunden", description: "Eventweise, DNF unterbricht die Serie", format: "count", direction: "desc", minimumSample: 1 },
  { key: "smooth", title: "Glatte Zeiten", description: "Exakt x,00 Sekunden", format: "count", direction: "desc", minimumSample: 1 },
  { key: "common", title: "Häufigste exakte Zeit", description: "Treffer je Spieler für diese Zeit", format: "count", overallFormat: "time", direction: "desc", minimumSample: 1 },
  { key: "event-max", title: "Meiste Versuche in einem Event", description: "Persönlicher Event-Höchstwert", format: "count", direction: "desc", minimumSample: 1 },
  { key: "lead-time", title: "Führungszeit", description: "Qualifizierte Event-Führungszeit", format: "duration", direction: "desc", minimumSample: 1 },
  { key: "event-breaks", title: "Event-Bestzeiten gebrochen", description: "Strikt schnellere Eventzeiten", format: "count", direction: "desc", minimumSample: 1 },
  { key: "takeovers", title: "Lead Takeovers", description: "Direkte Führungsübernahmen", format: "count", direction: "desc", minimumSample: 1 },
  { key: "rivalry-events", title: "Rivalry-Events", description: "Nur abgeschlossene qualifizierte Events", format: "count", direction: "desc", minimumSample: 1 },
  { key: "rivalry-takeovers", title: "Rivalry-Takeovers", description: "Direkte Wechsel in bestehenden Rivalry-Paarungen", format: "count", direction: "desc", minimumSample: 1 },
];

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
  const metrics: RankedMetric[] = definitions.filter((definition) => scope !== "special-event" || !definition.key.startsWith("rivalry-"))
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
