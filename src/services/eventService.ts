import { getSupabase } from "@/lib/supabase";
import { mapEvent } from "@/services/mappers";
import type { Event } from "@/types";

export async function getEvents(): Promise<Event[]> {
  const client = getSupabase();
  const [eventsResult, statsResult, attemptsResult, winnersResult] = await Promise.all([
    client.from("events").select("*").order("started_at", { ascending: false }),
    client.from("event_statistics").select("*"),
    client.from("attempts").select("event_id,player_id").eq("status", "approved").is("deleted_at", null),
    client.from("event_winners").select("*"),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (statsResult.error) throw statsResult.error;
  if (attemptsResult.error) throw attemptsResult.error;
  if (winnersResult.error) throw winnersResult.error;

  const statsByEvent = new Map(statsResult.data.map((row) => [row.event_id, row]));
  return eventsResult.data.map((row) => {
    const eventAttempts = attemptsResult.data.filter((attempt) => attempt.event_id === row.id);
    const participants = [...new Set(eventAttempts.map((attempt) => attempt.player_id))];
    const stats = statsByEvent.get(row.id);
    return {
      ...mapEvent(row, Number(stats?.valid_attempts ?? 0) + Number(stats?.dnf_count ?? 0), participants),
      validAttempts: Number(stats?.valid_attempts ?? 0),
      dnfCount: Number(stats?.dnf_count ?? 0),
      fastest: Number(stats?.fastest_hundredths ?? 0) / 100,
      average: Number(stats?.average_hundredths ?? 0) / 100,
      winnerNames: winnersResult.data
        .filter((winner) => winner.event_id === row.id)
        .map((winner) => winner.display_name),
    };
  });
}

export async function startEvent(name?: string, startedAt?: string) {
  const { data, error } = await getSupabase().rpc("admin_start_event", {
    p_name: name || null,
    p_started_at: startedAt || null,
  });
  if (error) throw error;
  return data;
}

export async function closeEvent(eventId: string) {
  const { error } = await getSupabase().rpc("admin_close_event", { p_event_id: eventId });
  if (error) throw error;
}

export async function updateEvent(
  eventId: string,
  changes: { name?: string | null; start_date?: string; started_at?: string; ends_at?: string },
) {
  const { error } = await getSupabase().from("events").update(changes).eq("id", eventId);
  if (error) throw error;
}
