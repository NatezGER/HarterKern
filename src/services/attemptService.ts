import { getSupabase } from "@/lib/supabase";
import { mapAttempt } from "@/services/mappers";
import type { Attempt } from "@/types";

export async function getRecentAttempts(limit = 100): Promise<Attempt[]> {
  const { data, error } = await getSupabase()
    .from("attempts")
    .select("*")
    .eq("status", "approved")
    .is("deleted_at", null)
    .not("event_id", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(mapAttempt);
}
