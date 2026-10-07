import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON, type SeasonSelection } from "@/lib/season";
import { ReadCache } from "@/services/readCache";
import type { RivalryHubPairV2, RivalryHubV2 } from "@/types/rivalryHub";

export const rivalryHubV2Cache = new ReadCache<RivalryHubV2>();
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const text = (value: unknown) => typeof value === "string" ? value : "";
const nullableText = (value: unknown) => typeof value === "string" ? value : null;
function avatar(url: unknown, path: unknown) {
  return typeof path === "string" && path ? getSupabase().storage.from("player-avatars").getPublicUrl(path).data.publicUrl : nullableText(url);
}
export function mapRivalryHubV2(value: unknown, season: SeasonSelection): RivalryHubV2 {
  const root = object(value);
  if (!Array.isArray(root.pairs) || root.seasonYear !== (season === ALL_TIME_SEASON ? null : season)) {
    throw new Error("Ungültiger Rivalry-Snapshot oder falscher Scope.");
  }
  const summary = object(root.summary);
  return { season, summary: { rivalryEvents: num(summary.rivalryEvents),
    playersWithRivalry: num(summary.playersWithRivalry), directTakeovers: num(summary.directTakeovers) },
    pairs: root.pairs.map(value => {
      const p = object(value);
      return {
        playerAId: text(p.playerAId), playerBId: text(p.playerBId),
        playerADisplayName: text(p.playerADisplayName), playerBDisplayName: text(p.playerBDisplayName),
        playerAAvatarUrl: avatar(p.playerAAvatarUrl, p.playerAAvatarPath),
        playerBAvatarUrl: avatar(p.playerBAvatarUrl, p.playerBAvatarPath),
        comparableH2hEvents: num(p.comparableH2hEvents), h2hWinsA: num(p.h2hWinsA),
        h2hWinsB: num(p.h2hWinsB), ties: num(p.ties),
        totalDirectTakeovers: num(p.totalDirectTakeovers), eventsWithTakeover: num(p.eventsWithTakeover),
        canonicalCommonEvents: num(p.canonicalCommonEvents), canonicalDirectTakeovers: num(p.canonicalDirectTakeovers),
        rivalryDirectTakeovers: num(p.rivalryDirectTakeovers), rivalryLength: num(p.rivalryLength),
        rivalryEvents: num(p.rivalryEvents), rivalryScore: num(p.rivalryScore),
        intensityPercent: p.intensityPercent == null ? null : num(p.intensityPercent),
        firstRivalryEventDateScope: nullableText(p.firstRivalryEventDateScope),
        lastRivalryEventDateScope: nullableText(p.lastRivalryEventDateScope),
        rivalryStatusAllTime: p.rivalryStatusAllTime === true,
        firstRivalryEventDateAllTime: nullableText(p.firstRivalryEventDateAllTime),
        rivalryLengthAllTime: num(p.rivalryLengthAllTime),
        formalRivalryInScope: p.formalRivalryInScope === true,
        historicalRivalry: p.historicalRivalry === true, duelOnly: p.duelOnly === true,
      } satisfies RivalryHubPairV2;
    }),
  };
}
export function getRivalryHubV2(season: SeasonSelection = ALL_TIME_SEASON, signal?: AbortSignal) {
  // Shared in-flight request must not be cancelled by just one consumer.
  return rivalryHubV2Cache.read(String(season), async () => {
    const { data, error } = await getSupabase().rpc("get_rivalry_hub_v2", {
      p_season_year: season === ALL_TIME_SEASON ? null : season,
    });
    if (error) throw error;
    return mapRivalryHubV2(data, season);
  }, signal);
}
