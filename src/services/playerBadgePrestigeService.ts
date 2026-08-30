import { getSupabase } from "@/lib/supabase";
import type { PlayerBadgePrestige } from "@/types/playerCompare";

export async function loadPlayerBadgePrestige(playerIds: string[]): Promise<Record<string, PlayerBadgePrestige>> {
  const uniqueIds = [...new Set(playerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};
  const { data, error } = await getSupabase().rpc("get_player_badge_prestige", { p_player_ids: uniqueIds });
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.player_id, {
    atLeastBronze: Number(row.at_least_bronze), atLeastSilver: Number(row.at_least_silver),
    atLeastGold: Number(row.at_least_gold), atLeastDiamond: Number(row.at_least_diamond),
    emerald: Number(row.emerald),
  }]));
}
