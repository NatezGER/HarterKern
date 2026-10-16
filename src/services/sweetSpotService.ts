import { getSupabase } from "@/lib/supabase";

export interface SweetSpot {
  attemptNumber: number;
  averageHundredths: number;
  samples: number;
  nextAttemptNumber: number;
}

/** One optional request for every permanent participant, never per card. */
export async function getEventSweetSpots(eventId: string): Promise<Map<string, SweetSpot>> {
  if (!eventId) return new Map();
  const { data, error } = await getSupabase().rpc("get_event_sweet_spots", { p_event_id: eventId });
  if (error) throw error;
  return new Map((data ?? []).map(row => [row.player_id, {
    attemptNumber: row.attempt_number,
    averageHundredths: row.average_hundredths,
    samples: Number(row.sample_count),
    nextAttemptNumber: row.next_attempt_number,
  }]));
}
