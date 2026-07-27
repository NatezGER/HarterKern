import { getSupabase } from "@/lib/supabase";
import type { DailyWinner, LeaderboardEntry, Statistic, WorldRecord } from "@/types";
import { hundredthsToSeconds } from "@/utils/time";

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await getSupabase()
    .from("public_hall_of_fame")
    .select("*")
    .order("rank");
  if (error) throw error;
  return data.map((row) => ({
    playerId: row.player_id,
    rank: row.rank,
    previousRank: row.rank,
    recordDate: row.record_date,
  }));
}

export async function getWorldRecordHistory(): Promise<WorldRecord[]> {
  const client = getSupabase();
  const [recordsResult, eventsResult] = await Promise.all([
    client.from("world_record_progression").select("*").order("achieved_at", { ascending: false }),
    client.from("events").select("id,name,start_date"),
  ]);
  if (recordsResult.error) throw recordsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  const events = new Map(eventsResult.data.map((event) => [event.id, event]));
  return recordsResult.data.map((row) => {
    const event = events.get(row.event_id);
    return {
      id: row.attempt_id,
      playerId: row.player_id,
      time: hundredthsToSeconds(row.time_hundredths),
      date: event?.start_date ?? row.achieved_at.slice(0, 10),
      location: event?.name || "Harter Kern Event",
    };
  });
}

export async function getDailyWinners(): Promise<DailyWinner[]> {
  const client = getSupabase();
  const [winnerResult, eventsResult, statsResult] = await Promise.all([
    client.from("event_winners").select("*"),
    client.from("events").select("id,start_date").order("started_at", { ascending: false }).limit(8),
    client.from("event_statistics").select("*"),
  ]);
  if (winnerResult.error) throw winnerResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (statsResult.error) throw statsResult.error;
  const stats = new Map(statsResult.data.map((row) => [row.event_id, row]));
  return eventsResult.data.flatMap((event) => {
    const winners = winnerResult.data.filter((winner) => winner.event_id === event.id);
    const eventStats = stats.get(event.id);
    return winners.map((winner) => ({
      id: `${event.id}-${winner.player_id}`,
      date: event.start_date,
      playerId: winner.player_id,
      time: hundredthsToSeconds(winner.winning_time_hundredths),
      attempts: Number(eventStats?.valid_attempts ?? 0) + Number(eventStats?.dnf_count ?? 0),
    }));
  }).slice(0, 4);
}

export async function getGlobalStatistics(): Promise<Statistic[]> {
  const { data, error } = await getSupabase().from("global_statistics").select("*").single();
  if (error) throw error;
  const time = (value: number | null) => value == null ? "—" : `${hundredthsToSeconds(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })} s`;
  return [
    { id: "fastest", label: "Schnellste Zeit", value: time(data.world_record_hundredths), change: "Aktueller Weltrekord", icon: "timer" },
    { id: "attempts", label: "Bestätigte Versuche", value: String(data.approved_attempts), change: "Nur reguläre Spieler", icon: "target" },
    { id: "valid", label: "Gültige Zeiten", value: String(data.valid_attempts), change: "DNF ausgeschlossen", icon: "timer" },
    { id: "dnf", label: "DNF", value: String(data.dnf_count), change: "Bestätigte Versuche", icon: "target" },
    { id: "players", label: "Reguläre Spieler", value: String(data.regular_players), change: "AK ausgeschlossen", icon: "users" },
    { id: "events", label: "Events", value: String(data.event_count), change: `Ø ${time(data.average_hundredths)}`, icon: "trophy" },
  ];
}
