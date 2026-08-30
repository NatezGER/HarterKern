import { getSupabase } from "@/lib/supabase";
import type { PlayerMostWantedStatistics } from "@/types/playerCompare";

export async function loadPlayerMostWantedStatistics(
  playerIds: string[],
  seasonYear?: number,
): Promise<Record<string, PlayerMostWantedStatistics>> {
  const uniqueIds = [...new Set(playerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};
  const { data, error } = await getSupabase().rpc("get_player_most_wanted_statistics", {
    p_player_ids: uniqueIds,
    p_season_year: seasonYear ?? null,
  });
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.player_id, {
    allTimeHits: Number(row.all_time_hits),
    seasonFirstHits: row.season_first_hits == null ? null : Number(row.season_first_hits),
  }]));
}
