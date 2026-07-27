import { getSupabase } from "@/lib/supabase";
import { mapAttempt } from "@/services/mappers";
import type { Attempt, PublicAttemptInput } from "@/types";

export async function getRecentAttempts(limit = 100): Promise<Attempt[]> {
  const { data, error } = await getSupabase()
    .from("attempts")
    .select("*")
    .eq("status", "approved")
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(mapAttempt);
}

export async function getPendingAttempts(): Promise<Attempt[]> {
  const { data, error } = await getSupabase()
    .from("attempts")
    .select("*")
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("submitted_at");
  if (error) throw error;
  return data.map(mapAttempt);
}

export async function getAdminAttempts(limit = 250): Promise<Attempt[]> {
  const { data, error } = await getSupabase()
    .from("attempts")
    .select("*")
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(mapAttempt);
}

export async function submitPublicAttempt(input: PublicAttemptInput) {
  const { data, error } = await getSupabase().rpc("submit_public_attempt", {
    p_client_identifier: input.clientIdentifier,
    p_is_dnf: input.isDnf,
    p_player_id: input.playerId ?? null,
    p_player_name: input.playerName ?? null,
    p_time_hundredths: input.timeHundredths,
  });
  if (error) throw error;
  return data;
}

export async function createAdminAttempt(input: {
  playerId: string;
  eventId: string;
  timeHundredths: number | null;
  isDnf: boolean;
}) {
  const client = getSupabase();
  const { data: userData } = await client.auth.getUser();
  const { error } = await client.from("attempts").insert({
    player_id: input.playerId,
    event_id: input.eventId,
    status: "approved",
    time_hundredths: input.timeHundredths,
    is_dnf: input.isDnf,
    source: "admin",
    created_by: userData.user?.id ?? null,
  });
  if (error) throw error;
}

export async function updateAttempt(
  id: string,
  changes: {
    player_id?: string;
    event_id?: string;
    time_hundredths?: number | null;
    is_dnf?: boolean;
    status?: "pending" | "approved" | "rejected";
  },
) {
  const { error } = await getSupabase().from("attempts").update(changes).eq("id", id);
  if (error) throw error;
}

export const approveAttempt = (id: string) => updateAttempt(id, { status: "approved" });
export const rejectAttempt = (id: string) => updateAttempt(id, { status: "rejected" });

export async function deleteAttempt(id: string) {
  const { error } = await getSupabase()
    .from("attempts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
