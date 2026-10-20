import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON, type SeasonSelection } from "@/lib/season";
import type { BeerStatistics } from "@/types/beerStatistics";

// The RPC is the only eligibility/ranking engine. Reject malformed/wrong-scope
// responses instead of presenting a failed read as zero consumption.
export function mapBeerStatistics(value: unknown, season: SeasonSelection): BeerStatistics {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ungültige Bierstatistik.");
  const root = value as Record<string, unknown>;
  if (root.seasonYear !== (season === ALL_TIME_SEASON ? null : season)
    || !root.summary || typeof root.summary !== "object"
    || !["brands", "favorites", "effects", "variety", "fastest", "unlucky"].every(key => Array.isArray(root[key]))) {
    throw new Error("Ungültige Bierstatistik oder falscher Zeitraum.");
  }
  return { season, summary: root.summary, brands: root.brands, favorites: root.favorites,
    effects: root.effects, variety: root.variety, fastest: root.fastest, unlucky: root.unlucky } as BeerStatistics;
}
export async function getBeerStatistics(season: SeasonSelection, signal?: AbortSignal) {
  const request = getSupabase().rpc("get_beer_statistics_dashboard", {
    p_season_year: season === ALL_TIME_SEASON ? null : season,
  });
  const { data, error } = signal ? await request.abortSignal(signal) : await request;
  if (error) throw error;
  return mapBeerStatistics(data, season);
}
