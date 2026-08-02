import { getSupabase } from "@/lib/supabase";
import type {
  BadgeRarity,
  DailyWinner,
  GroupMilestone,
  LeaderboardEntry,
  PrestigeActivity,
  LeagueTimeStatistics,
  MostWantedSnapshot,
  Statistic,
  WorldRecord,
} from "@/types";
import { hundredthsToSeconds } from "@/utils/time";

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await getSupabase()
    .from("public_hall_of_fame")
    .select("*")
    .order("personal_best_hundredths", { ascending: true })
    .order("display_name", { ascending: true });
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
  const { data, error } = await client.from("world_record_history").select("*")
    .order("sequence_number", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
      id: row.record_id,
      playerId: row.player_id,
      time: hundredthsToSeconds(row.time_hundredths),
      date: row.achieved_date,
      achievedAt: row.achieved_at,
      location: row.source_label,
      eventId: row.event_id,
      sourceType: row.source_type,
      previousTime: row.previous_record_hundredths == null
        ? null : hundredthsToSeconds(row.previous_record_hundredths),
      improvementHundredths: row.improvement_hundredths,
      durationDays: row.duration_days,
      isCurrent: row.is_current,
    }));
}

function resolveAvatar(path: string | null, legacy: string | null) {
  return path
    ? getSupabase().storage.from("player-avatars").getPublicUrl(path).data.publicUrl
    : legacy;
}

export async function getPrestigeActivities(): Promise<PrestigeActivity[]> {
  const client = getSupabase();
  const [prestigeResult, wantedResult] = await Promise.all([
    client.from("prestige_activity_feed").select("*")
      .order("occurred_at", { ascending: false }).order("priority", { ascending: false })
      .limit(18),
    client.from("most_wanted_activity_feed").select("*")
      .order("occurred_at", { ascending: false }).limit(12),
  ]);
  if (prestigeResult.error) throw prestigeResult.error;
  if (wantedResult.error) throw wantedResult.error;
  return [...prestigeResult.data, ...wantedResult.data].map((row) => ({
    id: row.activity_id,
    type: row.activity_type,
    occurredAt: row.occurred_at,
    playerId: row.player_id,
    playerName: row.display_name,
    avatarUrl: resolveAvatar(row.avatar_path, row.avatar_url),
    eventId: row.event_id,
    eventName: row.event_name,
    title: row.title,
    description: row.description,
    timeHundredths: row.time_hundredths,
    badgeKey: row.badge_key,
    tier: row.tier,
    priority: row.priority,
  })).sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) ||
    right.priority - left.priority).slice(0, 12);
}

export async function getMostWantedSnapshot(): Promise<MostWantedSnapshot> {
  const client = getSupabase();
  const [endingsResult, progressResult] = await Promise.all([
    client.from("most_wanted_endings").select("*").order("ending"),
    client.from("most_wanted_progress").select("*").single(),
  ]);
  if (endingsResult.error) throw endingsResult.error;
  if (progressResult.error) throw progressResult.error;
  const progress = progressResult.data;
  return {
    endings: endingsResult.data.map((row) => ({
      ending: row.ending,
      label: row.ending_label,
      achieved: row.achieved,
      hitCount: Number(row.hit_count),
      participantCount: Number(row.participant_count),
      playerId: row.first_player_id,
      guestId: row.first_guest_id,
      playerName: row.first_display_name,
      avatarUrl: resolveAvatar(row.first_avatar_path, row.first_avatar_url),
      isGuest: row.first_is_guest,
      timeHundredths: row.first_time_hundredths,
      occurredAt: row.first_occurred_at,
      occurredDate: row.first_occurred_date,
      hasExactTime: row.first_has_exact_time,
      eventId: row.first_event_id,
      sourceType: row.first_source_type,
      sourceLabel: row.source_label,
    })),
    reached: Number(progress.reached_count),
    total: Number(progress.total_count),
    percent: Number(progress.progress_percent),
    openEndings: progress.open_endings ?? [],
    mostCommonEnding: progress.most_common_ending,
    mostCommonHits: Number(progress.most_common_hit_count),
    rarestAchievedEndings: progress.rarest_achieved_endings ?? [],
  };
}

export async function getLeagueTimeStatistics(): Promise<LeagueTimeStatistics> {
  const client = getSupabase();
  const [summaryResult, thresholdsResult] = await Promise.all([
    client.from("league_time_statistics").select("*").single(),
    client.from("league_time_threshold_statistics").select("*").order("threshold_seconds"),
  ]);
  if (summaryResult.error) throw summaryResult.error;
  if (thresholdsResult.error) throw thresholdsResult.error;
  const row = summaryResult.data;
  return {
    totalValidTimes: Number(row.total_valid_times),
    mostCommonTimeHundredths: row.most_common_time_hundredths,
    mostCommonTimeHits: Number(row.most_common_time_hits),
    mostCommonTimeParticipants: Number(row.most_common_time_participants),
    smoothTimeCount: Number(row.smooth_time_count),
    mostCommonSmoothHundredths: row.most_common_smooth_time_hundredths,
    mostCommonSmoothHits: Number(row.most_common_smooth_time_hits),
    topSmoothPlayerId: row.top_smooth_player_id,
    topSmoothPlayerName: row.top_smooth_player_name,
    topSmoothPlayerAvatarUrl: resolveAvatar(
      row.top_smooth_player_avatar_path,
      row.top_smooth_player_avatar_url,
    ),
    topSmoothPlayerHits: Number(row.top_smooth_player_hits),
    latestSmoothPlayerName: row.latest_smooth_player_name,
    latestSmoothHundredths: row.latest_smooth_time_hundredths,
    latestSmoothAt: row.latest_smooth_occurred_at,
    latestSmoothDate: row.latest_smooth_occurred_date,
    latestSmoothHasExactTime: row.latest_smooth_has_exact_time ?? false,
    thresholds: thresholdsResult.data.map((threshold) => ({
      seconds: threshold.threshold_seconds,
      count: Number(threshold.attempt_count),
      total: Number(threshold.total_count),
      percent: Number(threshold.percentage),
    })),
  };
}

export async function getGroupMilestones(): Promise<GroupMilestone[]> {
  const { data, error } = await getSupabase().from("group_milestone_progress").select("*")
    .order("sort_order");
  if (error) throw error;
  return data.map((row) => ({
    key: row.milestone_key,
    threshold: row.threshold,
    name: row.name,
    description: row.description,
    currentCount: row.current_count,
    achieved: row.achieved,
    achievedAt: row.achieved_at,
    playerId: row.source_player_id,
    playerName: row.source_player_name,
    eventId: row.source_event_id,
    eventName: row.source_event_name,
  }));
}

export async function getBadgeRarity(): Promise<BadgeRarity[]> {
  const { data, error } = await getSupabase().from("badge_rarity_statistics").select("*")
    .order("tier_rank", { ascending: false })
    .order("recipient_count", { ascending: true })
    .order("sort_order");
  if (error) throw error;
  return data.map((row) => ({
    key: row.badge_key,
    name: row.name,
    tier: row.tier,
    recipients: row.recipient_count,
    playerCount: row.regular_player_count,
    percent: row.rarity_percent,
  }));
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
      id: `${event.id}-${winner.player_id ?? winner.guest_id}`,
      date: event.start_date,
      playerId: winner.player_id,
      participantName: winner.display_name,
      isGuest: winner.is_guest,
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
    { id: "attempts", label: "Eventversuche", value: String(data.approved_attempts), change: "Nur reguläre Spieler", icon: "target" },
    { id: "valid", label: "Gültige Zeiten", value: String(data.valid_attempts), change: "DNF ausgeschlossen", icon: "timer" },
    { id: "dnf", label: "DNF", value: String(data.dnf_count), change: "Bestätigte Versuche", icon: "target" },
    { id: "players", label: "Reguläre Spieler", value: String(data.regular_players), change: "Gäste ausgeschlossen", icon: "users" },
    { id: "events", label: "Events", value: String(data.event_count), change: `Ø ${time(data.average_hundredths)}`, icon: "trophy" },
  ];
}
