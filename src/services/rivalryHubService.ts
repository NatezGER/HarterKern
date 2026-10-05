import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON } from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";
import type { RivalryHubData, RivalryPairSummary } from "@/types/statDashboard";

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const number = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? value : 0;
const nullableNumber = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const string = (value: unknown): string => typeof value === "string" ? value : "";
const nullableString = (value: unknown): string | null => typeof value === "string" ? value : null;

function mapPair(value: unknown): RivalryPairSummary {
  const pair = object(value);
  return {
    playerLowId: string(pair.playerLowId),
    playerHighId: string(pair.playerHighId),
    playerLowName: string(pair.playerLowName) || "Unbekannt",
    playerHighName: string(pair.playerHighName) || "Unbekannt",
    rivalryEvents: number(pair.rivalryEvents),
    directTakeovers: number(pair.directTakeovers ?? pair.allDirectTakeovers),
    allDirectTakeovers: number(pair.allDirectTakeovers ?? pair.directTakeovers),
    rivalryDirectTakeovers: number(pair.rivalryDirectTakeovers),
    levelReached: pair.levelReached === true || number(pair.rivalryEvents) > 0,
    commonEvents: number(pair.commonEvents),
    spanDays: nullableNumber(pair.spanDays),
    firstRivalryDate: nullableString(pair.firstRivalryDate),
    lastRivalryDate: nullableString(pair.lastRivalryDate),
  };
}

export function mapRivalryHub(value: unknown): RivalryHubData {
  const root = object(value);
  const summary = object(root.summary);
  return {
    summary: {
      rivalryEvents: number(summary.rivalryEvents),
      playersWithRivalry: number(summary.playersWithRivalry),
      directTakeovers: number(summary.directTakeovers),
      strongestPair: summary.strongestPair ? mapPair(summary.strongestPair) : null,
      longestPair: summary.longestPair ? mapPair(summary.longestPair) : null,
    },
    pairs: array(root.pairs).map(mapPair),
  };
}

export async function getRivalryHub(
  season: SeasonSelection = ALL_TIME_SEASON,
  includePairs = true,
  signal?: AbortSignal,
) {
  const request = getSupabase().rpc("get_rivalry_hub", {
    p_season_year: season === ALL_TIME_SEASON ? null : season,
    p_include_pairs: includePairs,
  });
  const { data, error } = signal ? await request.abortSignal(signal) : await request;
  if (error) throw error;
  return mapRivalryHub(data);
}
