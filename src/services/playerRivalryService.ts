import { getSupabase } from "@/lib/supabase";
import type { PlayerRivalrySummary } from "@/types/historyProfiles";

export async function loadPlayerRivalries(playerId: string): Promise<PlayerRivalrySummary[]> {
  if (!playerId) return [];
  const client = getSupabase();
  const { data, error } = await client.rpc("get_player_rivalries", { p_player_id: playerId });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    rivalPlayerId: row.rival_player_id,
    rivalName: row.display_name,
    rivalAvatarUrl: row.avatar_path
      ? client.storage.from("player-avatars").getPublicUrl(row.avatar_path).data.publicUrl
      : row.avatar_url,
    rivalryEvents: Number(row.rivalry_events), directTakeovers: Number(row.direct_takeovers),
    firstRivalryDate: row.first_rivalry_date, lastRivalryDate: row.last_rivalry_date,
  }));
}
