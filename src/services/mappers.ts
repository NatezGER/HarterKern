import type { Database } from "@/types/database";
import type { Attempt, Event, Player } from "@/types";
import { getAvatarGradient, getInitials } from "@/utils/avatar";
import { hundredthsToSeconds } from "@/utils/time";
import { getSupabase } from "@/lib/supabase";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type PlayerStats = Pick<Database["public"]["Views"]["player_statistics"]["Row"],
  "personal_best_hundredths" | "average_hundredths" | "approved_attempts" |
  "valid_attempts" | "dnf_count" | "event_wins">;
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];

export function resolvePlayerAvatar(path: string | null, legacyUrl: string | null) {
  return path
    ? getSupabase().storage.from("player-avatars").getPublicUrl(path).data.publicUrl
    : legacyUrl;
}

export function mapPlayer(row: PlayerRow, stats?: PlayerStats): Player {
  const resolvedAvatar = resolvePlayerAvatar(row.avatar_path, row.avatar_url);
  return {
    id: row.id,
    name: row.display_name,
    initials: getInitials(row.display_name),
    avatarGradient: getAvatarGradient(row.id),
    avatarUrl: resolvedAvatar,
    personalBest: hundredthsToSeconds(stats?.personal_best_hundredths),
    average: hundredthsToSeconds(stats?.average_hundredths),
    attempts: Number(stats?.approved_attempts ?? 0),
    validAttempts: Number(stats?.valid_attempts ?? 0),
    dnfCount: Number(stats?.dnf_count ?? 0),
    dailyWins: Number(stats?.event_wins ?? 0),
    trend: "same",
    isAk: row.is_ak,
    isArchived: row.is_archived,
  };
}

export function mapEvent(
  row: EventRow,
  attempts = 0,
  participantIds: string[] = [],
): Event {
  return {
    id: row.id,
    title: row.name?.trim() || new Intl.DateTimeFormat("de-DE").format(new Date(`${row.start_date}T12:00:00`)),
    date: row.start_date,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    participantIds,
    attempts,
    validAttempts: 0,
    dnfCount: 0,
    fastest: 0,
    average: 0,
    winnerNames: [],
    status: row.status === "active" && new Date(row.ends_at).getTime() > Date.now()
      ? "active"
      : "closed",
    awardsTrophies: row.awards_trophies,
  };
}

export function mapAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    playerId: row.player_id,
    guestId: row.guest_id,
    eventId: row.event_id,
    timeHundredths: row.time_hundredths,
    isDnf: row.is_dnf,
    submittedAt: row.submitted_at,
  };
}
