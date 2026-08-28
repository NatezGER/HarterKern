import { getSupabase } from "@/lib/supabase";
import type {
  CompactBadge,
  EventAttemptDetail,
  EventDetail,
  EventParticipantDetail,
  AttemptNumberPoint,
  PlayerEventSummary,
  PlayerBingo,
  PlayerProfileCore,
  PlayerProfilePrestige,
  PlayerProfileProgression,
  TrophyAward,
} from "@/types/historyProfiles";
import type { PlayerCompareTimelineAttempt } from "@/types/playerCompare";
import type { BadgeUnlockCelebration } from "@/types/liveEvent";
import { calculateComparePerformance } from "@/lib/playerCompareDeep";
import { getSeasonDateRange } from "@/lib/season";
import { getAwardBadgeDisplayName } from "@/lib/badgePresentation";
import { getBadgeRarity } from "@/services/statsService";

const BADGE_RARITY_CACHE_TTL_MS = 5 * 60_000;
let badgeRarityCache: {
  expiresAt: number;
  values: Map<string, number | null>;
} | null = null;
let badgeRarityInFlight: Promise<Map<string, number | null>> | null = null;

async function getCachedBadgeRarity() {
  if (badgeRarityCache && badgeRarityCache.expiresAt > Date.now()) {
    return badgeRarityCache.values;
  }
  if (badgeRarityInFlight) return badgeRarityInFlight;
  badgeRarityInFlight = getBadgeRarity().then((badges) => {
    const values = new Map(badges.map((badge) => [badge.key, badge.percent]));
    badgeRarityCache = {
      values,
      expiresAt: Date.now() + BADGE_RARITY_CACHE_TTL_MS,
    };
    return values;
  }).finally(() => {
    badgeRarityInFlight = null;
  });
  return badgeRarityInFlight;
}

export async function getAttemptBadgeUnlocks(
  attemptId: string,
  playerName: string,
): Promise<BadgeUnlockCelebration[]> {
  const { data, error } = await getSupabase().from("public_player_badges")
    .select("award_key,badge_key,name,tier,description,category,metadata")
    .eq("source_attempt_id", attemptId)
    .order("awarded_at");
  if (error) throw error;
  return data.map((row) => ({
    key: row.award_key,
    badgeKey: row.badge_key,
    name: getAwardBadgeDisplayName(row.name, row.category,
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) &&
        "timeHundredths" in row.metadata && typeof row.metadata.timeHundredths === "number"
        ? row.metadata.timeHundredths : null),
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
    leadSeconds: 0,
    eventBestBreaks: 0,
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
  rarity_percent?: number | null;
  source_attempt_id: string | null;
  source_historical_attempt_id: string | null;
  source_event_name: string | null;
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_path: string | null;
  source_attempt_number: number | null;
  source_time_hundredths: number | null;
  threshold: number | null;
  is_special_event_badge: boolean;
  badge_kind?: CompactBadge["badgeKind"];
  design_variant?: CompactBadge["designVariant"];
  scope_type?: CompactBadge["scopeType"];
  metadata?: unknown;
}, rarityPercent?: number | null): CompactBadge {
  const metadataTime = row.metadata && typeof row.metadata === "object" &&
    !Array.isArray(row.metadata) && "timeHundredths" in row.metadata &&
    typeof row.metadata.timeHundredths === "number"
    ? row.metadata.timeHundredths
    : null;
  const bingoLineCounts = row.metadata && typeof row.metadata === "object" &&
    !Array.isArray(row.metadata) && "bronzeLines" in row.metadata &&
    "silverLines" in row.metadata && "goldLines" in row.metadata &&
    typeof row.metadata.bronzeLines === "number" &&
    typeof row.metadata.silverLines === "number" &&
    typeof row.metadata.goldLines === "number"
    ? { bronze: row.metadata.bronzeLines, silver: row.metadata.silverLines, gold: row.metadata.goldLines }
    : null;
  return {
    key: row.award_key,
    playerId: row.player_id,
    playerName: row.display_name,
    playerAvatarUrl: avatarUrl(row.avatar_path, row.avatar_url),
    name: getAwardBadgeDisplayName(row.name, row.category,
      row.source_time_hundredths ?? metadataTime),
    tier: row.tier,
    awardedAt: row.awarded_at,
    eventId: row.source_event_id,
    description: row.description,
    badgeKey: row.badge_key,
    category: row.category,
    familyKey: row.family_key,
    requirement: row.requirement ?? row.description,
    threshold: row.threshold,
    rarityPercent: rarityPercent ?? row.rarity_percent ?? null,
    sourceAttemptId: row.source_attempt_id,
    sourceHistoricalAttemptId: row.source_historical_attempt_id,
    eventName: row.source_event_name,
    sourceAttemptNumber: row.source_attempt_number,
    sourceTimeHundredths: row.source_time_hundredths ?? metadataTime,
    isSpecialEventBadge: row.is_special_event_badge,
    badgeKind: row.badge_kind ?? "tiered",
    designVariant: row.design_variant ?? "standard",
    scopeType: row.scope_type ?? "all_time",
    bingoLineCounts,
  };
}

function mapTrophy(row: {
  trophy_key: string;
  competition_type: TrophyAward["competitionType"];
  scope_type: TrophyAward["scopeType"];
  competition_id: string;
  season_key: string | null;
  competition_name: string;
  competition_year: number;
  event_date: string;
  placement: 1 | 2 | 3;
  trophy_tier: TrophyAward["tier"];
  player_id: string | null;
  guest_id: string | null;
  display_name: string;
  awarded_at: string;
}): TrophyAward {
  return {
    key: row.trophy_key,
    competitionType: row.competition_type,
    scopeType: row.scope_type,
    competitionId: row.competition_id,
    seasonKey: row.season_key,
    competitionName: row.competition_name,
    year: row.competition_year,
    eventDate: row.event_date,
    placement: row.placement,
    tier: row.trophy_tier,
    playerId: row.player_id,
    guestId: row.guest_id,
    playerName: row.display_name,
    awardedAt: row.awarded_at,
  };
}

export async function getEventDetail(eventId: string): Promise<EventDetail | null> {
  const client = getSupabase();
  const eventResult = await client.from("events").select("*")
    .eq("id", eventId).is("deleted_at", null).maybeSingle();
  if (eventResult.error) throw eventResult.error;
  const event = eventResult.data;
  if (!event) return null;
  const [statsResult, podiumResult, medalEventResult, attemptsResult, participantResult,
    leadResult] = await Promise.all([
    client.from("event_statistics").select("*").eq("event_id", eventId).maybeSingle(),
    client.from("event_podium").select("*").eq("event_id", eventId).order("rank"),
    client.rpc("get_medal_qualified_events", { p_event_ids: [eventId] }).maybeSingle(),
    client.from("event_attempt_details").select("*").eq("event_id", eventId).order("submitted_at"),
    client.from("event_participant_statistics").select("*").eq("event_id", eventId),
    client.from("event_lead_participant_statistics").select("*").eq("event_id", eventId),
  ]);
  for (const result of [statsResult, podiumResult, medalEventResult, attemptsResult,
    participantResult, leadResult]) {
    if (result.error) throw result.error;
  }
  const podiumRows = medalEventResult.data ? (podiumResult.data ?? []) : [];
  const attemptRows = attemptsResult.data ?? [];
  const participantRows = participantResult.data ?? [];
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
  const attemptNumbers = new Map<number, number[]>();
  for (const attempt of attempts) {
    if (attempt.isDnf || attempt.isAk || attempt.timeHundredths == null) continue;
    const times = attemptNumbers.get(attempt.attemptNumber) ?? [];
    times.push(attempt.timeHundredths);
    attemptNumbers.set(attempt.attemptNumber, times);
  }
  const leadByPlayer = new Map((leadResult.data ?? []).map((row) => [row.player_id, row]));
  const participantStats = participantRows.map((row) => {
    const participant = mapParticipant(row);
    const lead = participant.playerId ? leadByPlayer.get(participant.playerId) : null;
    return { ...participant, leadSeconds: Number(lead?.lead_seconds ?? 0),
      eventBestBreaks: Number(lead?.event_best_breaks ?? 0) };
  });
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
    awardsTrophies: event.awards_trophies,
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
    badges: [],
    photos: [],
    attemptNumbers: [...attemptNumbers.entries()]
      .sort(([left], [right]) => left - right)
      .map(([attemptNumber, times]) => ({
        attemptNumber,
        samples: times.length,
        averageHundredths: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
        bestHundredths: Math.min(...times),
        slowestHundredths: Math.max(...times),
      })),
    trophies: [],
    extras: { loading: true, errors: {} },
  };
}

export async function getEventDetailExtras(eventId: string) {
  const client = getSupabase();
  const [badgeResult, trophyResult] = await Promise.allSettled([
    client.from("event_badge_unlocks").select("*").eq("source_event_id", eventId)
      .order("tier_rank", { ascending: false })
      .order("is_special_event_badge", { ascending: false })
      .order("awarded_at"),
    client.from("player_trophies").select("*").eq("competition_id", eventId)
      .order("placement"),
  ]);
  const errors: NonNullable<EventDetail["extras"]>["errors"] = {};
  const badges = badgeResult.status === "fulfilled" && !badgeResult.value.error
    ? (badgeResult.value.data ?? []).map(mapBadge) : [];
  if (badgeResult.status === "rejected" || badgeResult.value.error) {
    errors.badges = "Badge-Unlocks konnten nicht geladen werden.";
  }
  const trophies = trophyResult.status === "fulfilled" && !trophyResult.value.error
    ? (trophyResult.value.data ?? []).map(mapTrophy) : [];
  if (trophyResult.status === "rejected" || trophyResult.value.error) {
    errors.trophies = "Trophäen konnten nicht geladen werden.";
  }
  return { badges, photos: [], trophies, extras: { loading: false, errors } };
}

export async function getPlayerProfileCore(playerId: string): Promise<PlayerProfileCore | null> {
  const client = getSupabase();
  const [playerResult, statsResult, rankResult, leadResult] = await Promise.all([
    client.from("players").select("*")
      .eq("id", playerId).eq("is_archived", false).maybeSingle(),
    client.from("player_statistics").select("*").eq("player_id", playerId).maybeSingle(),
    client.from("public_hall_of_fame").select("rank").eq("player_id", playerId).maybeSingle(),
    client.rpc("get_player_event_lead_statistics", {
      p_player_id: playerId, p_season_year: null,
    }).maybeSingle(),
  ]);
  for (const result of [playerResult, statsResult, rankResult, leadResult]) {
    if (result.error) throw result.error;
  }
  if (!playerResult.data) return null;
  const player = playerResult.data;
  const stats = statsResult.data;
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
    eventLeadSeconds: Number(leadResult.data?.total_lead_seconds ?? 0),
    eventBestBreaks: Number(leadResult.data?.event_best_breaks ?? 0),
  };
}

export async function getPlayerSeasonProfile(playerId: string, seasonYear: number) {
  const client = getSupabase();
  const [result, leadResult] = await Promise.all([
    client.rpc("get_player_season_profile", {
      p_player_id: playerId, p_season_year: seasonYear,
    }).maybeSingle(),
    client.rpc("get_player_event_lead_statistics", {
      p_player_id: playerId, p_season_year: seasonYear,
    }).maybeSingle(),
  ]);
  if (result.error) throw result.error;
  if (leadResult.error) throw leadResult.error;
  const row = result.data;
  if (!row) return null;
  return {
    personalBestHundredths: row.personal_best_hundredths,
    rank: row.season_rank,
    averageHundredths: row.average_hundredths,
    eventParticipations: Number(row.event_participations),
    wins: Number(row.event_wins),
    secondPlaces: Number(row.second_places),
    thirdPlaces: Number(row.third_places),
    validAttempts: Number(row.valid_attempts),
    dnfCount: Number(row.dnf_count),
    eventLeadSeconds: Number(leadResult.data?.total_lead_seconds ?? 0),
    eventBestBreaks: Number(leadResult.data?.event_best_breaks ?? 0),
  };
}

export async function getPlayerTimePerformance(playerId: string, seasonYear?: number) {
  const result = await getSupabase().rpc("get_player_qualified_times", {
    p_player_id: playerId,
    p_season_year: seasonYear ?? null,
  });
  if (result.error) throw result.error;
  const timeHundredths = (result.data ?? []).map((row) => row.time_hundredths)
    .sort((left, right) => left - right);
  return calculateComparePerformance(timeHundredths);
}

export async function getPlayerCompareTimeline(
  playerAId: string,
  playerBId: string,
  seasonYear?: number,
): Promise<PlayerCompareTimelineAttempt[]> {
  let query = getSupabase().from("attempts")
    .select("id,event_id,player_id,time_hundredths,is_dnf,submitted_at,events!inner(name,start_date,closed_at,ends_at,status,deleted_at)")
    .in("player_id", [playerAId, playerBId])
    .eq("status", "approved").is("deleted_at", null).eq("is_ak", false)
    .eq("events.status", "closed").is("events.deleted_at", null);
  if (seasonYear != null) {
    const { start, end } = getSeasonDateRange(seasonYear);
    query = query.gte("events.start_date", start).lt("events.start_date", end);
  }
  const result = await query.order("submitted_at").order("id");
  if (result.error) throw result.error;
  const attemptNumbers = new Map<string, number>();
  return (result.data ?? []).flatMap((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!row.player_id || !row.event_id || !event) return [];
    const key = `${row.event_id}:${row.player_id}`;
    const attemptNumber = (attemptNumbers.get(key) ?? 0) + 1;
    attemptNumbers.set(key, attemptNumber);
    return [{
      id: row.id,
      eventId: row.event_id,
      eventName: event.name?.trim() || "Spieleabend",
      eventDate: event.start_date,
      eventEndAt: event.closed_at ?? event.ends_at,
      playerId: row.player_id,
      timeHundredths: row.time_hundredths,
      isDnf: row.is_dnf,
      submittedAt: row.submitted_at,
      attemptNumber,
    }];
  });
}

export async function getPlayerBadges(playerId: string): Promise<CompactBadge[]> {
  const [result, rarityResult] = await Promise.all([
    getSupabase().rpc("get_player_visible_badges", { p_player_id: playerId }),
    getCachedBadgeRarity().then(
      (value) => ({ value }),
      () => ({ value: new Map<string, number | null>() }),
    ),
  ]);
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) =>
    mapBadge(row, rarityResult.value.get(row.badge_key) ?? null));
}

export async function getPlayerTrophies(playerId: string): Promise<TrophyAward[]> {
  const result = await getSupabase().rpc("get_player_trophies", {
    p_player_id: playerId,
  });
  if (result.error) throw result.error;
  return (result.data ?? []).map(mapTrophy);
}

export async function getPlayerPrestige(
  playerId: string,
  visibleBadgeCount: number,
): Promise<PlayerProfilePrestige> {
  const result = await getSupabase().rpc("get_player_profile_prestige", {
    p_player_id: playerId,
  }).maybeSingle();
  if (result.error) throw result.error;
  const prestige = result.data;
  return {
    pbCount: Number(prestige?.pb_count ?? 0),
    largestPbImprovementHundredths: prestige?.largest_pb_improvement_hundredths ?? null,
    averagePbImprovementHundredths: prestige?.average_pb_improvement_hundredths ?? null,
    worldRecordCount: Number(prestige?.world_record_count ?? 0),
    worldRecordDays: Number(prestige?.world_record_days ?? 0),
    longestWorldRecordDays: Number(prestige?.longest_world_record_days ?? 0),
    visibleBadgeCount,
  };
}

export async function getPlayerAttemptNumbers(playerId: string): Promise<AttemptNumberPoint[]> {
  const result = await getSupabase().rpc("get_player_attempt_number_statistics", {
    p_player_id: playerId,
  });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
      attemptNumber: row.attempt_number,
      samples: Number(row.attempt_count),
      validAttempts: Number(row.valid_attempts),
      dnfCount: Number(row.dnf_count),
      averageHundredths: row.average_hundredths,
    }));
}

export async function getPlayerEventHistory(playerId: string): Promise<PlayerEventSummary[]> {
  const result = await getSupabase().rpc("get_player_event_history", {
    p_player_id: playerId,
  });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
    eventId: row.event_id,
    eventName: row.event_name,
    eventDate: row.event_date,
    bestHundredths: row.best_time_hundredths,
    rank: row.rank,
    attempts: Number(row.attempt_count),
    validAttempts: Number(row.valid_attempts),
    dnfCount: Number(row.dnf_count),
  }));
}

export async function getClosedEventIds(eventIds: string[]): Promise<string[]> {
  if (eventIds.length === 0) return [];
  const result = await getSupabase().from("events").select("id")
    .in("id", eventIds).eq("status", "closed").is("deleted_at", null);
  if (result.error) throw result.error;
  return (result.data ?? []).map(({ id }) => id);
}

export async function getPlayerProgression(
  playerId: string,
  seasonYear?: number,
): Promise<PlayerProfileProgression> {
  const client = getSupabase();
  const personalQuery = seasonYear == null
    ? client.from("player_pb_history").select("*")
      .eq("player_id", playerId).order("sequence_number")
    : client.rpc("get_player_season_pb_history", {
      p_player_id: playerId,
      p_season_year: seasonYear,
    });
  const worldQuery = seasonYear == null
    ? client.from("world_record_history").select("*").order("sequence_number")
    : client.from("season_world_record_history").select("*")
      .eq("season_year", seasonYear).order("sequence_number");
  const [personalResult, worldResult] = await Promise.all([
    personalQuery,
    worldQuery,
  ]);
  if (personalResult.error) throw personalResult.error;
  if (worldResult.error) throw worldResult.error;
  return {
    personal: (personalResult.data ?? []).map((row) => ({
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
      sequenceNumber: seasonYear == null ? undefined : row.sequence_number,
    })),
    worldRecords: (worldResult.data ?? []).map((row) => ({
      id: row.record_id,
      playerId: row.player_id,
      playerName: row.display_name,
      avatarUrl: avatarUrl(row.avatar_path, row.avatar_url),
      timeHundredths: row.time_hundredths,
      achievedAt: row.achieved_at,
      achievedDate: row.achieved_date,
      eventId: row.event_id,
      sourceLabel: row.source_label,
      sourceType: row.source_type,
      improvementHundredths: row.improvement_hundredths,
      durationDays: row.duration_days,
      isCurrent: row.is_current,
    })),
  };
}

export async function getPlayerPersonalProgression(
  playerId: string,
  seasonYear?: number,
) {
  const result = seasonYear == null
    ? await getSupabase().from("player_pb_history").select("*")
      .eq("player_id", playerId).order("sequence_number")
    : await getSupabase().rpc("get_player_season_pb_history", {
      p_player_id: playerId,
      p_season_year: seasonYear,
    });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
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
  }));
}

export const emptyPlayerBingo: PlayerBingo = {
  fields: [],
  summary: {
    collectedEndings: 0,
    bronzeFields: 0,
    silverFields: 0,
    goldFields: 0,
    bronzeLines: 0,
    silverLines: 0,
    goldLines: 0,
    highestBadgeTier: null,
  },
};

export async function getPlayerBingo(playerId: string): Promise<PlayerBingo> {
  const result = await getSupabase().rpc("get_player_bingo", {
    p_player_id: playerId,
  });
  if (result.error) throw result.error;
  const rows = result.data ?? [];
  const stats = rows[0];
  return {
    fields: rows.map((field) => ({
      ending: field.ending, label: field.ending_label,
      hitCount: field.hit_count, tier: field.field_tier,
      hits: (Array.isArray(field.hits) ? field.hits : []) as unknown as
        PlayerBingo["fields"][number]["hits"],
    })),
    summary: {
      collectedEndings: stats?.collected_endings ?? 0,
      bronzeFields: stats?.bronze_fields ?? 0,
      silverFields: stats?.silver_fields ?? 0,
      goldFields: stats?.gold_fields ?? 0,
      bronzeLines: stats?.bronze_lines ?? 0,
      silverLines: stats?.silver_lines ?? 0,
      goldLines: stats?.gold_lines ?? 0,
      highestBadgeTier: stats?.highest_badge_tier ?? null,
    },
  };
}
