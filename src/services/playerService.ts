import { getSupabase } from "@/lib/supabase";
import { mapPlayer } from "@/services/mappers";
import type { Player } from "@/types";
import { ALL_TIME_SEASON } from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";

export async function getPlayers(season: SeasonSelection = ALL_TIME_SEASON): Promise<Player[]> {
  const client = getSupabase();
  const coreColumns = "player_id,personal_best_hundredths,approved_attempts,valid_attempts,dnf_count,average_hundredths,event_wins";
  const statisticsQuery = season === ALL_TIME_SEASON
    ? client.from("player_statistics").select(coreColumns)
    : client.from("season_player_statistics").select(coreColumns).eq("season_year", season);
  const [playersResult, statsResult] = await Promise.all([
    client.from("players").select("*").eq("is_archived", false).order("display_name"),
    statisticsQuery,
  ]);
  if (playersResult.error) throw playersResult.error;
  if (statsResult.error) throw statsResult.error;

  const statsByPlayer = new Map(statsResult.data.map((row) => [row.player_id, row]));
  return playersResult.data.map((row) => mapPlayer(row, statsByPlayer.get(row.id)));
}

export async function updatePlayer(
  id: string,
  changes: { display_name?: string; is_ak?: boolean; is_archived?: boolean },
) {
  const { error } = await getSupabase().from("players").update(changes).eq("id", id);
  if (error) throw error;
}

export async function createPlayer(displayName: string) {
  const { data, error } = await getSupabase()
    .from("players")
    .insert({ display_name: displayName.trim() })
    .select("*")
    .single();
  if (error) throw error;
  return mapPlayer(data);
}

export async function mergePlayers(sourcePlayerId: string, targetPlayerId: string) {
  const { error } = await getSupabase().rpc("admin_merge_players", {
    p_source_player_id: sourcePlayerId,
    p_target_player_id: targetPlayerId,
  });
  if (error) throw error;
}
