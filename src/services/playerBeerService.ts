import { getSupabase } from "@/lib/supabase";
export interface BeerBrandRanking {
  brand: string; imagePath: string | null; attempts: number;
  bestHundredths: number; worstHundredths: number; averageHundredths: number;
}
export interface PlayerBeerProfile {
  brandRankings?: BeerBrandRanking[];
  validAttempts: number;
  beers: Array<{ brand: string; bestHundredths: number; attempts: number; imagePath: string | null }>;
}
export async function getPlayerBeerProfile(playerId: string, seasonYear?: number): Promise<PlayerBeerProfile> {
  const { data, error } = await getSupabase().rpc("get_player_beer_profile", { p_player_id: playerId, p_season_year: seasonYear ?? null });
  if (error) throw error;
  const value = data as unknown as PlayerBeerProfile & { seasonYear: number | null };
  if (!value || value.seasonYear !== (seasonYear ?? null) || !Number.isInteger(value.validAttempts) || value.validAttempts < 0 || !Array.isArray(value.beers)) throw new Error("Ungültige persönliche Bierdaten.");
  if (value.brandRankings !== undefined && (!Array.isArray(value.brandRankings) || value.brandRankings.some(brand =>
    !brand || typeof brand.brand !== "string" || !brand.brand.trim()
    || (brand.imagePath !== null && typeof brand.imagePath !== "string")
    || !Number.isInteger(brand.attempts) || brand.attempts < 1
    || ![brand.bestHundredths, brand.worstHundredths, brand.averageHundredths].every(time => Number.isFinite(time) && time > 0)
    || brand.bestHundredths > brand.averageHundredths || brand.averageHundredths > brand.worstHundredths
  ))) throw new Error("Ungültiges persönliches Bier-Ranking.");
  return value;
}
