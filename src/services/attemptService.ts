import { getSupabase } from "@/lib/supabase";
import type { Attempt } from "@/types";

export async function getRecentAttempts(limit = 100): Promise<Attempt[]> {
  const { data, error } = await getSupabase()
    .from("event_attempt_details")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((row): Attempt => ({
    id: row.attempt_id,
    playerId: row.player_id,
    guestId: row.guest_id,
    eventId: row.event_id,
    timeHundredths: row.time_hundredths,
    isDnf: row.is_dnf,
    submittedAt: row.submitted_at,
  }));
}
