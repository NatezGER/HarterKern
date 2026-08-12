import { getSupabase } from "@/lib/supabase";
import { mapEvent } from "@/services/mappers";
import type { Event } from "@/types";
import type { Database } from "@/types/database";
import { ALL_TIME_SEASON, getSeasonDateRange } from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";

export async function getEvents(season: SeasonSelection = ALL_TIME_SEASON): Promise<Event[]> {
  const client = getSupabase();
  if (season === ALL_TIME_SEASON) {
    const [eventsResult, statsResult, participantsResult, guestsResult, podiumResult, winnersResult] =
      await Promise.all([
      client.from("events").select("*").is("deleted_at", null)
        .order("started_at", { ascending: false }),
      client.from("event_statistics").select("*"),
      client.from("event_participants").select("event_id,player_id"),
      client.from("event_guests").select("event_id,id"),
      client.from("qualified_event_podium").select("*"),
      client.from("event_winners").select("event_id,display_name"),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (statsResult.error) throw statsResult.error;
    if (participantsResult.error) throw participantsResult.error;
    if (guestsResult.error) throw guestsResult.error;
    if (podiumResult.error) throw podiumResult.error;
    if (winnersResult.error) throw winnersResult.error;

    return mapEvents(
      eventsResult.data,
      statsResult.data,
      participantsResult.data,
      guestsResult.data,
      podiumResult.data,
      winnersResult.data,
    );
  }

  let eventsQuery = client.from("events").select("*").is("deleted_at", null);
  const range = getSeasonDateRange(season);
  eventsQuery = eventsQuery.gte("start_date", range.start).lt("start_date", range.end);
  const selectedEventsResult = await eventsQuery.order("started_at", { ascending: false });
  if (selectedEventsResult.error) throw selectedEventsResult.error;
  if (selectedEventsResult.data.length === 0) return [];
  const eventIds = selectedEventsResult.data.map(({ id }) => id);
  const [statsResult, participantsResult, guestsResult, podiumResult, winnersResult] = await Promise.all([
    client.from("event_statistics").select("*").in("event_id", eventIds),
    client.from("event_participants").select("event_id,player_id").in("event_id", eventIds),
    client.from("event_guests").select("event_id,id").in("event_id", eventIds),
    client.from("qualified_event_podium").select("*").in("event_id", eventIds),
    client.from("event_winners").select("event_id,display_name").in("event_id", eventIds),
  ]);
  if (statsResult.error) throw statsResult.error;
  if (participantsResult.error) throw participantsResult.error;
  if (guestsResult.error) throw guestsResult.error;
  if (podiumResult.error) throw podiumResult.error;
  if (winnersResult.error) throw winnersResult.error;

  return mapEvents(
    selectedEventsResult.data,
    statsResult.data,
    participantsResult.data,
    guestsResult.data,
    podiumResult.data,
    winnersResult.data,
  );
}

function mapEvents(
  events: Database["public"]["Tables"]["events"]["Row"][],
  statistics: Database["public"]["Views"]["event_statistics"]["Row"][],
  participantsByEvent: Pick<
    Database["public"]["Tables"]["event_participants"]["Row"],
    "event_id" | "player_id"
  >[],
  guestsByEvent: Pick<
    Database["public"]["Tables"]["event_guests"]["Row"],
    "event_id" | "id"
  >[],
  podiumByEvent: Database["public"]["Views"]["event_podium"]["Row"][],
  winnersByEvent: Pick<Database["public"]["Views"]["event_winners"]["Row"],
    "event_id" | "display_name">[],
): Event[] {
  const statsByEvent = new Map(statistics.map((row) => [row.event_id, row]));
  return events.map((row) => {
    const participants = participantsByEvent
      .filter((participant) => participant.event_id === row.id)
      .map((participant) => participant.player_id)
      .concat(guestsByEvent
        .filter((guest) => guest.event_id === row.id)
        .map((guest) => guest.id));
    const stats = statsByEvent.get(row.id);
    return {
      ...mapEvent(row, Number(stats?.valid_attempts ?? 0) + Number(stats?.dnf_count ?? 0), participants),
      validAttempts: Number(stats?.valid_attempts ?? 0),
      dnfCount: Number(stats?.dnf_count ?? 0),
      fastest: Number(stats?.fastest_hundredths ?? 0) / 100,
      average: Number(stats?.average_hundredths ?? 0) / 100,
      winnerNames: winnersByEvent
        .filter((entry) => entry.event_id === row.id)
        .map((entry) => entry.display_name),
      podium: podiumByEvent
        .filter((entry) => entry.event_id === row.id)
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 3)
        .map((entry) => ({
          id: entry.player_id ?? entry.guest_id ?? `${row.id}-${entry.rank}`,
          playerId: entry.player_id,
          isGuest: entry.player_id == null,
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
