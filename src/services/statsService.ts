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
  EventLeadPlayerStatistic,
} from "@/types";
import { hundredthsToSeconds } from "@/utils/time";
import { ALL_TIME_SEASON, getSeasonDateRange } from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";
import { dnfPercentage } from "@/lib/officialTimePerformance";

export async function getLeaderboard(season: SeasonSelection = ALL_TIME_SEASON): Promise<LeaderboardEntry[]> {
  const query = season === ALL_TIME_SEASON
    ? getSupabase().from("public_hall_of_fame").select("*")
    : getSupabase().from("season_hall_of_fame").select("*").eq("season_year", season);
  const { data, error } = await query
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

export async function getWorldRecordHistory(
  season: SeasonSelection = ALL_TIME_SEASON,
): Promise<WorldRecord[]> {
  const client = getSupabase();
  const query = season === ALL_TIME_SEASON
    ? client.from("world_record_history").select("*")
    : client.from("season_world_record_history").select("*").eq("season_year", season);
  const { data, error } = await query
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

export async function getMostWantedSnapshot(
  season: SeasonSelection = ALL_TIME_SEASON,
): Promise<MostWantedSnapshot> {
  const client = getSupabase();
  const endingsQuery = season === ALL_TIME_SEASON
    ? client.from("most_wanted_endings").select("*").order("ending")
    : client.from("season_most_wanted_endings").select("*")
      .eq("season_year", season).order("ending");
  const progressQuery = season === ALL_TIME_SEASON
    ? client.from("most_wanted_progress").select("*").single()
    : client.from("season_most_wanted_progress").select("*")
      .eq("season_year", season).single();
  const hitsQuery = season === ALL_TIME_SEASON
    ? client.from("qualified_official_times").select("source_id,player_id,guest_id,display_name,avatar_url,avatar_path,is_guest,time_hundredths,occurred_at,occurred_date,has_exact_time,source_type,source_priority,source_order")
    : client.from("season_qualified_official_times").select("source_id,player_id,guest_id,display_name,avatar_url,avatar_path,is_guest,time_hundredths,occurred_at,occurred_date,has_exact_time,source_type,source_priority,source_order")
      .eq("season_year", season);
  const [endingsResult, progressResult, hitsResult] = await Promise.all([
    endingsQuery,
    progressQuery,
    hitsQuery,
  ]);
  if (endingsResult.error) throw endingsResult.error;
  if (progressResult.error) throw progressResult.error;
  if (hitsResult.error) throw hitsResult.error;
  const progress = progressResult.data;
  const hits = [...hitsResult.data].sort((left, right) =>
    left.occurred_at.localeCompare(right.occurred_at) ||
    left.source_priority - right.source_priority ||
    left.source_order - right.source_order ||
    left.source_id.localeCompare(right.source_id));
  const hitsByEnding = new Map<number, typeof hits>();
  const hunterEndings = new Map<string, { name: string; avatarUrl: string | null; endings: Set<number> }>();
  for (const hit of hits) {
    const ending = hit.time_hundredths % 100;
    hitsByEnding.set(ending, [...(hitsByEnding.get(ending) ?? []), hit]);
    if (!hit.is_guest && hit.player_id) {
      const hunter = hunterEndings.get(hit.player_id) ?? {
        name: hit.display_name,
        avatarUrl: resolveAvatar(hit.avatar_path, hit.avatar_url),
        endings: new Set<number>(),
      };
      hunter.endings.add(ending);
      hunterEndings.set(hit.player_id, hunter);
    }
  }
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
      sourceOrder: hitsByEnding.get(row.ending)?.[0]?.source_order ?? null,
      sourceLabel: row.source_label,
      additionalHits: (hitsByEnding.get(row.ending) ?? []).slice(1).map((hit) => ({
        id: hit.source_id,
        playerId: hit.player_id,
        guestId: hit.guest_id,
        playerName: hit.display_name,
        avatarUrl: resolveAvatar(hit.avatar_path, hit.avatar_url),
        isGuest: hit.is_guest,
        timeHundredths: hit.time_hundredths,
        occurredAt: hit.occurred_at,
        occurredDate: hit.occurred_date,
        hasExactTime: hit.has_exact_time,
        sourceType: hit.source_type,
        sourceOrder: hit.source_order,
      })),
    })),
    reached: Number(progress.reached_count),
    total: Number(progress.total_count),
    percent: Number(progress.progress_percent),
    openEndings: progress.open_endings ?? [],
    mostCommonEnding: progress.most_common_ending,
    mostCommonHits: Number(progress.most_common_hit_count),
    rarestAchievedEndings: progress.rarest_achieved_endings ?? [],
    topHunters: [...hunterEndings.entries()].map(([playerId, hunter]) => ({
      id: playerId,
      playerId,
      playerName: hunter.name,
      avatarUrl: hunter.avatarUrl,
      endingCount: hunter.endings.size,
    })).sort((left, right) => right.endingCount - left.endingCount ||
      left.playerName.localeCompare(right.playerName, "de") ||
      left.playerId.localeCompare(right.playerId)).slice(0, 5),
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
  const client = getSupabase();
  const [rarityResult, recipientsResult] = await Promise.all([
    client.from("badge_rarity_statistics").select("*")
      .order("tier_rank", { ascending: false })
      .order("recipient_count", { ascending: true })
      .order("sort_order"),
    client.from("public_player_badges")
      .select("badge_key,player_id,display_name,avatar_url,design_variant")
      .order("display_name"),
  ]);
  if (rarityResult.error) throw rarityResult.error;
  if (recipientsResult.error) throw recipientsResult.error;
  const variants = new Map(recipientsResult.data.map((row) => [
    row.badge_key, row.design_variant,
  ]));
  const badges = rarityResult.data.map((row) => ({
    key: row.badge_key,
    name: row.name,
    tier: row.tier,
    designVariant: variants.get(row.badge_key) ?? "standard",
    recipients: row.recipient_count,
    playerCount: row.regular_player_count,
    percent: row.rarity_percent,
  }));
  return attachBadgeRecipients(badges, recipientsResult.data.map((row) => ({
    badgeKey: row.badge_key,
    playerId: row.player_id,
    playerName: row.display_name,
    avatarUrl: row.avatar_url,
  })));
}

export function attachBadgeRecipients(
  badges: Array<Omit<BadgeRarity, "recipientsList">>,
  recipients: Array<BadgeRarity["recipientsList"][number] & { badgeKey: string }>,
): BadgeRarity[] {
  const recipientsByBadge = new Map<string, Map<string, BadgeRarity["recipientsList"][number]>>();
  recipients.forEach(({ badgeKey, ...recipient }) => {
    const badgeRecipients = recipientsByBadge.get(badgeKey) ?? new Map();
    badgeRecipients.set(recipient.playerId, recipient);
    recipientsByBadge.set(badgeKey, badgeRecipients);
  });
  return badges.map((badge) => ({
    ...badge,
    recipientsList: [...(recipientsByBadge.get(badge.key)?.values() ?? [])],
  }));
}

export async function getDailyWinners(season: SeasonSelection = ALL_TIME_SEASON): Promise<DailyWinner[]> {
  const client = getSupabase();
  let eventsQuery = client.from("events").select("id,start_date");
  if (season !== ALL_TIME_SEASON) {
    const range = getSeasonDateRange(season);
    eventsQuery = eventsQuery.gte("start_date", range.start).lt("start_date", range.end);
  }
  const selectedEventsResult = await eventsQuery.order("started_at", { ascending: false }).limit(8);
  if (selectedEventsResult.error) throw selectedEventsResult.error;
  if (selectedEventsResult.data.length === 0) return [];
  const ids = selectedEventsResult.data.map(({ id }) => id);
  const winnerQuery = client.from("event_winners").select("*");
  const statsQuery = client.from("event_statistics").select("*");
  const [winnerResult, eventsResult, statsResult] = await Promise.all([
    season === ALL_TIME_SEASON ? winnerQuery : winnerQuery.in("event_id", ids),
    Promise.resolve({ data: selectedEventsResult.data, error: null }),
    season === ALL_TIME_SEASON ? statsQuery : statsQuery.in("event_id", ids),
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

export async function getGlobalStatistics(season: SeasonSelection = ALL_TIME_SEASON): Promise<Statistic[]> {
  const client = getSupabase();
  if (season === ALL_TIME_SEASON) {
    const { data, error } = await client.from("global_statistics").select("*").single();
    if (error) throw error;
    return mapGlobalStatistics(data, season);
  }
  const [statisticsResult, bestTimeResult] = await Promise.all([
    client.from("season_global_statistics").select("*")
      .eq("season_year", season).maybeSingle(),
    client.from("season_qualified_official_times").select("time_hundredths")
      .eq("season_year", season).order("time_hundredths").limit(1).maybeSingle(),
  ]);
  if (statisticsResult.error) throw statisticsResult.error;
  if (bestTimeResult.error) throw bestTimeResult.error;
  const values = statisticsResult.data ?? { regular_players: 0, event_count: 0, approved_attempts: 0,
    valid_attempts: 0, dnf_count: 0, world_record_hundredths: null,
    average_hundredths: null };
  return mapGlobalStatistics(withQualifiedSeasonBest(
    values,
    bestTimeResult.data?.time_hundredths ?? null,
  ), season);
}

export async function getEventLeadPlayerStatistics(
  season: SeasonSelection = ALL_TIME_SEASON,
): Promise<EventLeadPlayerStatistic[]> {
  const client = getSupabase();
  let query = client.from("event_lead_player_statistics_v2").select("*");
  if (season !== ALL_TIME_SEASON) query = query.eq("season_year", season);
  const { data, error } = await query
    .order("total_lead_seconds", { ascending: false })
    .order("display_name", { ascending: true });
  if (error) throw error;

  const combined = new Map<string, EventLeadPlayerStatistic>();
  const aggregation = new Map<string, { segments: number; qualifiedSeconds: number }>();
  for (const row of data) {
    const existing = combined.get(row.player_id);
    const nextTotal = (existing?.totalLeadSeconds ?? 0) + Number(row.total_lead_seconds);
    const nextEvents = (existing?.eventsLed ?? 0) + Number(row.events_led);
    const previousAggregation = aggregation.get(row.player_id) ?? {
      segments: 0, qualifiedSeconds: 0,
    };
    const nextAggregation = {
      segments: previousAggregation.segments + Number(row.lead_segment_count),
      qualifiedSeconds: previousAggregation.qualifiedSeconds
        + Number(row.qualified_event_duration_seconds),
    };
    aggregation.set(row.player_id, nextAggregation);
    combined.set(row.player_id, {
      playerId: row.player_id,
      playerName: row.display_name,
      avatarUrl: resolveAvatar(row.avatar_path, row.avatar_url),
      totalLeadSeconds: nextTotal,
      leadTakeovers: (existing?.leadTakeovers ?? 0) + Number(row.lead_takeovers),
      leadLosses: (existing?.leadLosses ?? 0) + Number(row.lead_losses),
      eventBestBreaks: (existing?.eventBestBreaks ?? 0) + Number(row.event_best_breaks),
      eventsLed: nextEvents,
      longestLeadSeconds: Math.max(existing?.longestLeadSeconds ?? 0,
        Number(row.longest_lead_seconds)),
      averageLeadSeconds: nextAggregation.segments
        ? Math.round(nextTotal / nextAggregation.segments) : 0,
      leadSharePercent: nextAggregation.qualifiedSeconds
        ? Math.round(nextTotal / nextAggregation.qualifiedSeconds * 1000) / 10 : 0,
    });
  }
  return [...combined.values()].sort((left, right) =>
    right.totalLeadSeconds - left.totalLeadSeconds
      || left.playerName.localeCompare(right.playerName, "de"));
}

export function withQualifiedSeasonBest<T extends { world_record_hundredths: number | null }>(
  eventStatistics: T,
  qualifiedBestHundredths: number | null,
): T {
  return { ...eventStatistics, world_record_hundredths: qualifiedBestHundredths };
}

export function mapGlobalStatistics(values: {
  regular_players: number;
  event_count: number;
  approved_attempts: number;
  valid_attempts: number;
  dnf_count: number;
  world_record_hundredths: number | null;
  average_hundredths: number | null;
}, season: SeasonSelection): Statistic[] {
  const time = (value: number | null) => value == null ? "—" : `${hundredthsToSeconds(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })} s`;
  const dnfPercent = dnfPercentage(Number(values.valid_attempts), Number(values.dnf_count));
  return [
    { id: "fastest", label: "Schnellste Zeit", value: time(values.world_record_hundredths), change: season === ALL_TIME_SEASON ? "Aktueller Weltrekord" : `Saisonrekord ${season}`, icon: "timer" },
    { id: "valid", label: "Gültige Eventversuche", value: String(values.valid_attempts), change: "Offizielle Zeiten", icon: "timer" },
    { id: "dnf", label: "DNF", value: `${values.dnf_count} · ${dnfPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`, change: "Anteil aller Eventversuche", icon: "target" },
    { id: "players", label: "Reguläre Spieler", value: String(values.regular_players), change: "Gäste ausgeschlossen", icon: "users" },
    { id: "events", label: "Events", value: String(values.event_count), change: "Abgeschlossene Abende", icon: "trophy" },
    { id: "average", label: "Durchschnitt", value: time(values.average_hundredths), change: "Reguläre offizielle Eventzeiten", icon: "timer" },
  ];
}
