import { getSupabase } from "@/lib/supabase";
import { mapEvent } from "@/services/mappers";
import type { Event } from "@/types";

export async function getEvents(): Promise<Event[]> {
  const client = getSupabase();
  const [eventsResult, statsResult, participantsResult, guestsResult, podiumResult] =
    await Promise.all([
    client.from("events").select("*").is("deleted_at", null)
      .order("started_at", { ascending: false }),
    client.from("event_statistics").select("*"),
    client.from("event_participants").select("event_id,player_id"),
    client.from("event_guests").select("event_id,id"),
    client.from("event_podium").select("*"),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (statsResult.error) throw statsResult.error;
  if (participantsResult.error) throw participantsResult.error;
  if (guestsResult.error) throw guestsResult.error;
  if (podiumResult.error) throw podiumResult.error;

  const statsByEvent = new Map(statsResult.data.map((row) => [row.event_id, row]));
  return eventsResult.data.map((row) => {
    const participants = participantsResult.data
      .filter((participant) => participant.event_id === row.id)
      .map((participant) => participant.player_id)
      .concat(guestsResult.data
        .filter((guest) => guest.event_id === row.id)
        .map((guest) => guest.id));
    const stats = statsByEvent.get(row.id);
    return {
      ...mapEvent(row, Number(stats?.valid_attempts ?? 0) + Number(stats?.dnf_count ?? 0), participants),
      validAttempts: Number(stats?.valid_attempts ?? 0),
      dnfCount: Number(stats?.dnf_count ?? 0),
      fastest: Number(stats?.fastest_hundredths ?? 0) / 100,
      average: Number(stats?.average_hundredths ?? 0) / 100,
      winnerNames: podiumResult.data
        .filter((entry) => entry.event_id === row.id && entry.rank === 1)
        .map((entry) => entry.display_name),
      podium: podiumResult.data
        .filter((entry) => entry.event_id === row.id)
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 3)
        .map((entry) => ({
          id: entry.player_id ?? entry.guest_id ?? `${row.id}-${entry.rank}`,
          name: entry.display_name,
          avatarUrl: entry.avatar_url,
          rank: entry.rank,
          time: entry.best_time_hundredths / 100,
        })),
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
