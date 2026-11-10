import { getSupabase } from "@/lib/supabase";
export interface PlayerBeerProfile {
  validAttempts: number;
  beers: Array<{ brand: string; bestHundredths: number; attempts: number; imagePath: string | null }>;
}
export async function getPlayerBeerProfile(playerId: string, seasonYear?: number): Promise<PlayerBeerProfile> {
  const { data, error } = await getSupabase().rpc("get_player_beer_profile", { p_player_id: playerId, p_season_year: seasonYear ?? null });
  if (error) throw error;
  const value = data as unknown as PlayerBeerProfile & { seasonYear: number | null };
  if (!value || value.seasonYear !== (seasonYear ?? null) || !Number.isInteger(value.validAttempts) || value.validAttempts < 0 || !Array.isArray(value.beers)) throw new Error("Ungültige persönliche Bierdaten.");
  return value;
}
