import { loadPlayerProfileSection } from "@/services/playerProfileService";
import { getClosedEventIds } from "@/services/historyProfileService";
import { createHeadToHeadSummary, emptyHeadToHeadSummary } from "@/lib/playerCompare";
import { getSupabase } from "@/lib/supabase";
import type {
  PlayerProfileCore,
  PlayerSeasonProfile,
  PlayerTimePerformance,
  HeadToHeadSummary,
} from "@/types/historyProfiles";
import type { PlayerCompareMetricBundle } from "@/types/playerCompare";

export interface ComparePlayerCore {
  identity: PlayerProfileCore;
  statistics: PlayerProfileCore | PlayerSeasonProfile | null;
}

export interface PlayerCompareCore {
  playerA: ComparePlayerCore | null;
  playerB: ComparePlayerCore | null;
}

export interface PlayerCompareSpeed {
  playerA: PlayerTimePerformance | null;
  playerB: PlayerTimePerformance | null;
}

async function loadCore(playerId: string | null, seasonYear?: number) {
  if (!playerId) return null;
  const [identity, season] = await Promise.all([
    loadPlayerProfileSection("core", playerId),
    seasonYear == null
      ? Promise.resolve(null)
      : loadPlayerProfileSection("season", playerId, { seasonYear }),
  ]);
  if (!identity || identity.isAk) return null;
  return { identity, statistics: seasonYear == null ? identity : season };
}

export async function loadPlayerCompareCore(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<PlayerCompareCore> {
  const [playerA, playerB] = await Promise.all([
    loadCore(playerAId, seasonYear),
    loadCore(playerBId, seasonYear),
  ]);
  return { playerA, playerB };
}

async function loadSpeed(playerId: string | null, seasonYear?: number) {
  return playerId
    ? loadPlayerProfileSection("performance", playerId, { seasonYear })
    : null;
}

export async function loadPlayerCompareSpeed(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<PlayerCompareSpeed> {
  const [playerA, playerB] = await Promise.all([
    loadSpeed(playerAId, seasonYear),
    loadSpeed(playerBId, seasonYear),
  ]);
  return { playerA, playerB };
}

export async function loadPlayerHeadToHead(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<HeadToHeadSummary> {
  if (!playerAId || !playerBId || playerAId === playerBId) {
    return emptyHeadToHeadSummary();
  }
  const [playerAHistory, playerBHistory, rivalryResult] = await Promise.all([
    loadPlayerProfileSection("events", playerAId),
    loadPlayerProfileSection("events", playerBId),
    getSupabase().rpc("get_pair_rivalry", { p_player_a_id: playerAId, p_player_b_id: playerBId, p_season_year: seasonYear ?? null }),
  ]);
  if (rivalryResult.error) throw rivalryResult.error;
  const playerBEventIds = new Set(playerBHistory.map(({ eventId }) => eventId));
  const sharedEventIds = playerAHistory
    .map(({ eventId }) => eventId)
    .filter((eventId, index, all) => (
      playerBEventIds.has(eventId) && all.indexOf(eventId) === index
    ));
  const closedEventIds = await getClosedEventIds(sharedEventIds);
  const summary = createHeadToHeadSummary(
    playerAHistory,
    playerBHistory,
    new Set(closedEventIds),
    seasonYear,
  );
  const rivalryRows = rivalryResult.data ?? [];
  const rivalryByEvent = new Map(rivalryRows.flatMap((row) => row.event_id ? [[row.event_id, row] as const] : []));
  const totals = rivalryRows[0];
  return {
    ...summary,
    events: summary.events.map((event) => ({ ...event,
      isRivalryEvent: rivalryByEvent.get(event.eventId)?.is_rivalry_event ?? false,
      directTakeovers: Number(rivalryByEvent.get(event.eventId)?.direct_takeovers ?? 0),
    })),
    rivalry: {
      commonEvents: Number(totals?.common_events ?? summary.totalDuels),
      rivalryEvents: Number(totals?.rivalry_events ?? 0),
      directTakeovers: Number(totals?.total_direct_takeovers ?? 0),
      firstRivalryDate: totals?.first_rivalry_date ?? null,
      lastRivalryDate: totals?.last_rivalry_date ?? null,
    },
  };
}

type JsonObject = Record<string, unknown>;
const asObject = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const asNumber = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;

export async function loadPlayerCompareMetricBundle(
  playerAId: string | null,
  playerBId: string | null,
  seasonYear?: number,
): Promise<PlayerCompareMetricBundle | null> {
  if (!playerAId || !playerBId || playerAId === playerBId) return null;
  const { data, error } = await getSupabase().rpc("get_player_compare_metric_bundle", {
    p_player_ids: [playerAId, playerBId],
    p_season_year: seasonYear ?? null,
  });
  if (error) throw error;
  const root = asObject(data);
  const players = asArray(root.players).map((value) => {
    const player = asObject(value);
    return {
      playerId: typeof player.playerId === "string" ? player.playerId : "",
      metrics: asArray(player.metrics).map((metricValue) => {
        const metric = asObject(metricValue);
        return {
          key: typeof metric.key === "string" ? metric.key : "",
          value: asNumber(metric.value), count: asNumber(metric.count), total: asNumber(metric.total),
          detail: typeof metric.detail === "string" ? metric.detail : null,
          qualified: metric.qualified === true,
        };
      }),
    };
  });
  const pair = asObject(root.pair);
  const n = (key: string) => asNumber(pair[key]) ?? 0;
  return { players, pair: {
    commonEvents: n("commonEvents"), decidedEvents: n("decidedEvents"),
    playerAWins: n("playerAWins"), playerBWins: n("playerBWins"), ties: n("ties"),
    directTakeovers: n("directTakeovers"), playerATakeovers: n("playerATakeovers"), playerBTakeovers: n("playerBTakeovers"),
    rivalryEvents: n("rivalryEvents"), rivalrySpanDays: asNumber(pair.rivalrySpanDays),
    intensityPercent: asNumber(pair.intensityPercent), balancePercent: asNumber(pair.balancePercent),
    playerANemesisLosses: n("playerANemesisLosses"), playerBNemesisLosses: n("playerBNemesisLosses"),
    playerAFavoriteWins: n("playerAFavoriteWins"), playerBFavoriteWins: n("playerBFavoriteWins"),
  } };
}
