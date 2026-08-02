import { getSupabase } from "@/lib/supabase";
import type {
  CompactBadge,
  EventAttemptDetail,
  EventDetail,
  EventParticipantDetail,
  PlayerProfileDetail,
} from "@/types/historyProfiles";
import type { BadgeUnlockCelebration } from "@/types/liveEvent";

export async function getAttemptBadgeUnlocks(
  attemptId: string,
  playerName: string,
): Promise<BadgeUnlockCelebration[]> {
  const { data, error } = await getSupabase().from("public_player_badges")
    .select("award_key,badge_key,name,tier,description")
    .eq("source_attempt_id", attemptId)
    .order("awarded_at");
  if (error) throw error;
  return data.map((row) => ({
    key: row.award_key,
    badgeKey: row.badge_key,
    name: row.name,
    tier: row.tier,
    requirement: row.description,
    playerName,
  }));
}

function avatarUrl(path: string | null, legacyUrl: string | null) {
  if (!path) return legacyUrl;
  return getSupabase().storage.from("player-avatars").getPublicUrl(path).data.publicUrl;
}

function mapParticipant(row: {
  player_id: string | null;
  guest_id: string | null;
  display_name: string;
  avatar_url: string | null;
  avatar_path?: string | null;
  is_guest: boolean;
  is_ak?: boolean;
  attempt_count?: number;
  valid_attempts?: number;
  dnf_count?: number;
  best_time_hundredths: number | null;
  average_hundredths?: number | null;
  rank?: number | null;
  participant_rank?: number | null;
}): EventParticipantDetail {
  return {
    playerId: row.player_id,
    guestId: row.guest_id,
    name: row.display_name,
    avatarUrl: avatarUrl(row.avatar_path ?? null, row.avatar_url),
    isGuest: row.is_guest,
    isAk: row.is_ak ?? false,
    attempts: Number(row.attempt_count ?? 0),
    validAttempts: Number(row.valid_attempts ?? 0),
    dnfCount: Number(row.dnf_count ?? 0),
    bestHundredths: row.best_time_hundredths,
    averageHundredths: row.average_hundredths ?? null,
    rank: row.rank ?? row.participant_rank ?? null,
  };
}

function mapBadge(row: {
  award_key: string;
  name: string;
  tier: CompactBadge["tier"];
  awarded_at: string;
  source_event_id: string | null;
  description: string;
  badge_key: string;
  category: string;
  family_key: string | null;
  requirement: string | null;
  recipient_count: number;
  regular_player_count: number;
  rarity_percent: number | null;
  source_attempt_id: string | null;
  source_historical_attempt_id: string | null;
  source_event_name: string | null;
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_path: string | null;
  source_attempt_number: number | null;
  source_time_hundredths: number | null;
  next_badge_name: string | null;
  next_requirement: string | null;
  next_tier: CompactBadge["tier"] | null;
  next_threshold: number | null;
  current_progress: number | null;
  threshold: number | null;
  is_special_event_badge: boolean;
}): CompactBadge {
  return {
    key: row.award_key,
    playerId: row.player_id,
    playerName: row.display_name,
    playerAvatarUrl: avatarUrl(row.avatar_path, row.avatar_url),
    name: row.name,
    tier: row.tier,
    awardedAt: row.awarded_at,
    eventId: row.source_event_id,
    description: row.description,
    badgeKey: row.badge_key,
    category: row.category,
    familyKey: row.family_key,
    requirement: row.requirement ?? row.description,
    threshold: row.threshold,
    recipientCount: Number(row.recipient_count),
    regularPlayerCount: Number(row.regular_player_count),
    rarityPercent: row.rarity_percent,
    sourceAttemptId: row.source_attempt_id,
    sourceHistoricalAttemptId: row.source_historical_attempt_id,
    eventName: row.source_event_name,
    sourceAttemptNumber: row.source_attempt_number,
    sourceTimeHundredths: row.source_time_hundredths,
    nextBadgeName: row.next_badge_name,
    nextRequirement: row.next_requirement,
    nextTier: row.next_tier,
    nextThreshold: row.next_threshold,
    currentProgress: row.current_progress,
    isSpecialEventBadge: row.is_special_event_badge,
  };
}

export async function getEventDetail(eventId: string): Promise<EventDetail | null> {
  const client = getSupabase();
  const [eventResult, statsResult, podiumResult, attemptsResult, participantResult,
    badgeResult, photoResult, attemptNumbersResult] = await Promise.all([
    client.from("events").select("*").eq("id", eventId).is("deleted_at", null).maybeSingle(),
    client.from("event_statistics").select("*").eq("event_id", eventId).maybeSingle(),
    client.from("event_podium").select("*").eq("event_id", eventId).order("rank"),
    client.from("event_attempt_details").select("*").eq("event_id", eventId).order("submitted_at"),
    client.from("event_participant_statistics").select("*").eq("event_id", eventId),
    client.from("event_badge_unlocks").select("*").eq("source_event_id", eventId)
      .order("tier_rank", { ascending: false })
      .order("is_special_event_badge", { ascending: false })
      .order("awarded_at"),
    client.from("event_photos").select("*").eq("event_id", eventId)
      .order("sort_order").order("created_at"),
    client.from("event_attempt_number_statistics").select("*").eq("event_id", eventId)
      .order("attempt_number"),
  ]);
  for (const result of [eventResult, statsResult, podiumResult, attemptsResult,
    participantResult, badgeResult, photoResult, attemptNumbersResult]) {
    if (result.error) throw result.error;
  }
  const event = eventResult.data;
  if (!event) return null;
  const photoRows = photoResult.data ?? [];
  const podiumRows = podiumResult.data ?? [];
  const attemptRows = attemptsResult.data ?? [];
  const participantRows = participantResult.data ?? [];
  const badgeRows = badgeResult.data ?? [];
  const signed = photoRows.length
    ? await client.storage.from("event-photos")
      .createSignedUrls(photoRows.map(({ storage_path }) => storage_path), 3600)
    : { data: [], error: null };
  if (signed.error) throw signed.error;
  const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
  const attempts: EventAttemptDetail[] = attemptRows.map((row) => ({
    id: row.attempt_id,
    playerId: row.player_id,
    guestId: row.guest_id,
    name: row.display_name,
    avatarUrl: avatarUrl(row.avatar_path, row.avatar_url),
    isGuest: row.is_guest,
    isAk: row.is_ak,
    timeHundredths: row.time_hundredths,
    isDnf: row.is_dnf,
    submittedAt: row.submitted_at,
    attemptNumber: row.attempt_number,
    rank: row.participant_rank,
    isPb: row.is_personal_best,
    isWr: row.is_world_record,
    isEb: row.is_event_best,
  }));
  const participantStats = participantRows.map(mapParticipant);
  const stats = statsResult.data;
  return {
    id: event.id,
    name: event.name?.trim() || "Spieleabend",
    date: event.start_date,
    startedAt: event.started_at,
    closedAt: event.closed_at,
    status: event.status,
    description: event.description,
    isImportant: event.is_important,
    participants: Number(stats?.participant_count ?? 0),
    validAttempts: Number(stats?.valid_attempts ?? 0),
    dnfCount: Number(stats?.dnf_count ?? 0),
    fastestHundredths: stats?.fastest_hundredths ?? null,
    averageHundredths: stats?.average_hundredths ?? null,
    podium: podiumRows.map((row) => {
      const participant = participantStats.find((item) =>
        item.playerId === row.player_id && item.guestId === row.guest_id);
      return {
        ...mapParticipant(row),
        avatarUrl: participant?.avatarUrl ?? row.avatar_url,
        attempts: participant?.attempts ?? 0,
        validAttempts: participant?.validAttempts ?? 0,
        dnfCount: participant?.dnfCount ?? 0,
        averageHundredths: participant?.averageHundredths ?? null,
      };
    }),
    participantStats,
    attempts,
    badges: badgeRows.map(mapBadge),
    photos: photoRows.map((row) => ({
      id: row.id,
      path: row.storage_path,
      url: urls.get(row.storage_path) ?? "",
      caption: row.caption,
    })).filter(({ url }) => Boolean(url)),
    attemptNumbers: (attemptNumbersResult.data ?? []).map((row) => ({
      attemptNumber: row.attempt_number,
      samples: Number(row.sample_count),
      averageHundredths: row.average_hundredths,
      bestHundredths: row.best_hundredths,
      slowestHundredths: row.slowest_hundredths,
    })),
  };
}

export async function getPlayerProfileDetail(playerId: string): Promise<PlayerProfileDetail | null> {
  const client = getSupabase();
  const [playerResult, statsResult, rankResult, historyResult, badgeResult, pointsResult,
    progressionResult, prestigeResult] =
    await Promise.all([
      client.from("players").select("*").eq("id", playerId).eq("is_archived", false).maybeSingle(),
      client.from("player_statistics").select("*").eq("player_id", playerId).maybeSingle(),
      client.from("public_hall_of_fame").select("rank").eq("player_id", playerId).maybeSingle(),
      client.from("player_event_history").select("*").eq("player_id", playerId)
        .order("event_date", { ascending: false }),
      client.from("visible_player_badges").select("*").eq("player_id", playerId)
        .order("tier_rank", { ascending: false })
        .order("is_special_event_badge", { ascending: false })
        .order("recipient_count", { ascending: true })
        .order("sort_order"),
      client.from("player_attempt_number_statistics").select("*").eq("player_id", playerId)
        .order("attempt_number"),
      client.from("player_pb_history").select("*").eq("player_id", playerId)
        .order("sequence_number"),
      client.from("player_prestige_statistics").select("*").eq("player_id", playerId)
        .maybeSingle(),
    ]);
  for (const result of [playerResult, statsResult, rankResult, historyResult, badgeResult,
    pointsResult, progressionResult, prestigeResult]) {
    if (result.error) throw result.error;
  }
  const player = playerResult.data;
  if (!player) return null;
  const stats = statsResult.data;
  const historyRows = historyResult.data ?? [];
  const badgeRows = badgeResult.data ?? [];
  const pointRows = pointsResult.data ?? [];
  const progressionRows = progressionResult.data ?? [];
  const prestige = prestigeResult.data;
  return {
    id: player.id,
    name: player.display_name,
    avatarUrl: avatarUrl(player.avatar_path, player.avatar_url),
    avatarPath: player.avatar_path,
    isAk: player.is_ak,
    personalBestHundredths: stats?.personal_best_hundredths ?? null,
    rank: rankResult.data?.rank ?? null,
    averageHundredths: stats?.average_hundredths ?? null,
    eventParticipations: Number(stats?.event_participations ?? 0),
    wins: Number(stats?.event_wins ?? 0),
    secondPlaces: Number(stats?.second_places ?? 0),
    thirdPlaces: Number(stats?.third_places ?? 0),
    validAttempts: Number(stats?.valid_attempts ?? 0),
    dnfCount: Number(stats?.dnf_count ?? 0),
    events: historyRows.map((row) => ({
      eventId: row.event_id,
      eventName: row.event_name,
      eventDate: row.event_date,
      bestHundredths: row.best_time_hundredths,
      rank: row.rank,
      attempts: Number(row.attempt_count),
      validAttempts: Number(row.valid_attempts),
      dnfCount: Number(row.dnf_count),
    })),
    badges: badgeRows.map(mapBadge),
    attemptNumbers: pointRows.map((row) => ({
      attemptNumber: row.attempt_number,
      samples: Number(row.attempt_count),
      validAttempts: Number(row.valid_attempts),
      dnfCount: Number(row.dnf_count),
      averageHundredths: row.average_hundredths,
    })),
    progression: progressionRows.map((row) => ({
      id: row.source_id,
      timeHundredths: row.time_hundredths,
      achievedAt: row.achieved_at,
      achievedDate: row.achieved_date,
      eventId: row.event_id,
      sourceLabel: row.source_label,
      sourceType: row.source_type,
      previousHundredths: row.previous_best_hundredths,
      improvementHundredths: row.improvement_hundredths,
      durationDays: row.duration_days,
      isCurrent: row.is_current,
    })),
    pbCount: Number(prestige?.pb_count ?? 0),
    largestPbImprovementHundredths: prestige?.largest_pb_improvement_hundredths ?? null,
    averagePbImprovementHundredths: prestige?.average_pb_improvement_hundredths ?? null,
    worldRecordCount: Number(prestige?.world_record_count ?? 0),
    worldRecordDays: Number(prestige?.world_record_days ?? 0),
    longestWorldRecordDays: Number(prestige?.longest_world_record_days ?? 0),
    visibleBadgeCount: Number(prestige?.visible_badge_count ?? 0),
  };
}
