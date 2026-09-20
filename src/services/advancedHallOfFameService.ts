import { getSupabase } from "@/lib/supabase";

export type TwoInSixtyMode = "best" | "frequency";

export interface TwoInSixtyEntry {
  rank: number;
  playerId: string;
  playerName: string;
  runCount: number;
  firstTimeHundredths: number;
  secondTimeHundredths: number;
  sumHundredths: number;
  eventId: string;
  eventName: string;
  eventDate: string;
}

export interface RankedOfficialAttempt {
  rank: number;
  sourceId: string;
  sourceType: string;
  playerId: string | null;
  guestId: string | null;
  playerName: string;
  timeHundredths: number;
  eventName: string | null;
  sourceLabel: string | null;
  occurredDate: string;
  attemptNumber: number | null;
}

export interface RankedAttemptsPage {
  entries: RankedOfficialAttempt[];
  totalCount: number;
}

export async function getTwoInSixtyHallOfFame(mode: TwoInSixtyMode): Promise<TwoInSixtyEntry[]> {
  const { data, error } = await getSupabase().rpc("get_two_in_sixty_hall_of_fame", { p_mode: mode });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    rank: Number(row.rank), playerId: row.player_id, playerName: row.display_name,
    runCount: Number(row.run_count), firstTimeHundredths: row.first_time_hundredths,
    secondTimeHundredths: row.second_time_hundredths,
    sumHundredths: row.sum_hundredths, eventId: row.event_id,
    eventName: row.event_name, eventDate: row.event_date,
  }));
}

export async function getRankedOfficialAttempts(offset: number, limit = 50): Promise<RankedAttemptsPage> {
  const { data, error } = await getSupabase().rpc("get_ranked_official_attempts", {
    p_limit: limit, p_offset: offset,
  });
  if (error) throw error;
  return {
    entries: (data ?? []).map((row) => ({
      rank: Number(row.rank), sourceId: row.source_id, sourceType: row.source_type,
      playerId: row.player_id, guestId: row.guest_id,
      playerName: row.display_name, timeHundredths: row.time_hundredths,
      eventName: row.event_name, sourceLabel: row.source_label,
      occurredDate: row.occurred_date, attemptNumber: row.attempt_number,
    })),
    totalCount: Number(data?.[0]?.total_count ?? 0),
  };
}

export async function getEventFirstAttemptBenchmarks(eventId: string): Promise<Map<string, number>> {
  const { data, error } = await getSupabase().rpc("get_event_first_attempt_benchmarks", {
    p_event_id: eventId,
  });
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.player_id, row.best_time_hundredths]));
}
