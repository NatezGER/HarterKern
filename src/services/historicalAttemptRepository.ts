import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { HistoricalAttemptInput } from "@/types/liveEvent";
import { hundredthsToSeconds } from "@/utils/time";

export function mapHistoricalAttempt(
  row: Database["public"]["Tables"]["historical_attempts"]["Row"],
) {
  return {
    id: row.id,
    playerId: row.player_id,
    displayName: row.display_name,
    date: row.attempt_date,
    timeSeconds: hundredthsToSeconds(row.time_hundredths),
    historicalLabel: row.historical_label ?? undefined,
    isGuest: row.is_guest,
    outOfCompetition: row.out_of_competition,
    sortOrder: row.sort_order,
  };
}
export async function createHistoricalAttempt(input: HistoricalAttemptInput) {
  const { data, error } = await getSupabase().rpc("sync_create_historical_attempt", {
    p_player_id: input.playerId,
    p_guest_name: input.guestName?.trim() || null,
    p_attempt_date: input.date,
    p_time_hundredths: Math.round(input.timeSeconds * 100),
    p_historical_label: input.historicalLabel?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function updateHistoricalAttempt(
  id: string,
  input: HistoricalAttemptInput,
) {
  const { error } = await getSupabase().rpc("sync_update_historical_attempt", {
    p_attempt_id: id,
    p_player_id: input.playerId,
    p_guest_name: input.guestName?.trim() || null,
    p_attempt_date: input.date,
    p_time_hundredths: Math.round(input.timeSeconds * 100),
    p_historical_label: input.historicalLabel?.trim() || null,
  });
  if (error) throw error;
}

export async function deleteHistoricalAttempt(id: string) {
  const { error } = await getSupabase().rpc("sync_delete_historical_attempt", {
    p_attempt_id: id,
  });
  if (error) throw error;
}
