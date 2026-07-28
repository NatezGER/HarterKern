import { getSupabase } from "@/lib/supabase";
import { loadPublicData } from "@/services/publicDataService";
import type { PublicDataSnapshot } from "@/types";
import type {
  AttemptInput,
  AttemptUpdate,
  LiveEventState,
  LiveParticipant,
  StartLiveEventInput,
} from "@/types/liveEvent";
import { getAvatarGradient, getInitials } from "@/utils/avatar";
import { hundredthsToSeconds } from "@/utils/time";

export interface DataPlatformSnapshot {
  publicData: PublicDataSnapshot;
  liveState: LiveEventState;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loadDataPlatform(): Promise<DataPlatformSnapshot> {
  const client = getSupabase();
  const [publicData, playersResult, eventsResult, participantsResult, attemptsResult] =
    await Promise.all([
      loadPublicData(),
      client.from("players").select("*").eq("is_archived", false),
      client.from("events").select("*").order("started_at", { ascending: false }),
      client.from("event_participants").select("*").order("joined_at"),
      client.from("attempts").select("*")
        .eq("status", "approved")
        .is("deleted_at", null)
        .order("submitted_at", { ascending: false }),
    ]);
  const error = playersResult.error ?? eventsResult.error ??
    participantsResult.error ?? attemptsResult.error;
  if (error) throw error;

  const playerRows = playersResult.data ?? [];
  const eventRows = eventsResult.data ?? [];
  const participantRows = participantsResult.data ?? [];
  const attemptRows = attemptsResult.data ?? [];
  const publicPlayers = new Map(publicData.players.map((player) => [player.id, player]));
  const players: LiveParticipant[] = playerRows.map((row) => {
    const publicPlayer = publicPlayers.get(row.id);
    return {
      id: row.id,
      name: row.display_name,
      initials: getInitials(row.display_name),
      avatarGradient: getAvatarGradient(row.id),
      avatarUrl: row.avatar_url,
      personalBest: publicPlayer?.personalBest ?? 0,
      isAk: row.is_ak,
    };
  });
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const events = eventRows.map((row) => ({
    id: row.id,
    name: row.name ?? undefined,
    date: row.start_date,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    endedAt: row.closed_at ?? undefined,
    status: row.status === "active" ? "active" as const : "completed" as const,
    participantIds: participantRows
      .filter(({ event_id }) => event_id === row.id)
      .map(({ player_id }) => player_id),
    createdBy: "Supabase",
    winnerPlayerId: row.winner_player_id ?? undefined,
    endReason: row.end_reason === "automatic"
      ? "automatic" as const
      : row.end_reason === "manual" ? "manual" as const : undefined,
  }));
  const attempts = attemptRows.map((row) => ({
    id: row.id,
    playerId: row.player_id,
    eventId: row.event_id ?? undefined,
    eventName: row.event_name ?? undefined,
    result: row.is_dnf ? "dns" as const : "time" as const,
    timeSeconds: row.is_dnf ? undefined : hundredthsToSeconds(row.time_hundredths),
    date: row.submitted_at.slice(0, 10),
    submittedAt: row.submitted_at,
    outOfCompetition: row.is_ak || (playerMap.get(row.player_id)?.isAk ?? false),
  }));
  return {
    publicData,
    liveState: { version: 2, players, events, attempts },
  };
}

export async function upsertCanonicalPlayer(
  player: Pick<LiveParticipant, "name" | "isAk">,
  legacySourceId?: string,
) {
  const { data, error } = await getSupabase().rpc("sync_upsert_player", {
    p_display_name: player.name,
    p_is_ak: player.isAk,
    p_legacy_source_id: legacySourceId ?? null,
  });
  if (error) throw error;
  return data;
}

async function resolveParticipants(participants: LiveParticipant[]) {
  return Promise.all(participants.map((player) =>
    uuidPattern.test(player.id)
      ? Promise.resolve(player.id)
      : upsertCanonicalPlayer(player, `pr5-player:${player.id}`),
  ));
}

export async function startRemoteEvent(
  input: StartLiveEventInput,
  legacySourceId?: string,
  timing?: { startedAt: string; endsAt: string },
) {
  const participantIds = await resolveParticipants(input.participants);
  const { data, error } = await getSupabase().rpc("sync_start_event", {
    p_name: input.name?.trim() || null,
    p_start_date: input.date,
    p_participant_ids: participantIds,
    p_started_at: timing?.startedAt ?? null,
    p_ends_at: timing?.endsAt ?? null,
    p_legacy_source_id: legacySourceId ?? null,
  });
  if (error) throw error;
  return { eventId: data, participantIds };
}

export async function importClosedRemoteEvent(
  event: LiveEventState["events"][number],
  participantIds: string[],
) {
  const { data, error } = await getSupabase().rpc("sync_import_closed_event", {
    p_name: event.name?.trim() || null,
    p_start_date: event.date,
    p_started_at: event.startedAt,
    p_ends_at: event.endsAt,
    p_ended_at: event.endedAt ?? null,
    p_end_reason: event.endReason ?? null,
    p_participant_ids: participantIds,
    p_legacy_source_id: `pr5-event:${event.id}`,
  });
  if (error) throw error;
  return data;
}

export async function createRemoteAttempt(
  input: AttemptInput,
  options?: { id?: string; legacySourceId?: string; submittedAt?: string },
) {
  const id = options?.id ?? crypto.randomUUID();
  const { data, error } = await getSupabase().rpc("sync_create_attempt", {
    p_id: id,
    p_player_id: input.playerId,
    p_event_id: input.eventId ?? null,
    p_time_hundredths: input.result === "time"
      ? Math.round((input.timeSeconds ?? 0) * 100)
      : null,
    p_is_dnf: input.result === "dns",
    p_is_ak: input.outOfCompetition,
    p_submitted_at: options?.submittedAt ?? new Date().toISOString(),
    p_event_name: input.eventName?.trim() || null,
    p_legacy_source_id: options?.legacySourceId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function updateRemoteAttempt(
  id: string,
  current: LiveEventState["attempts"][number],
  changes: AttemptUpdate,
) {
  const result = changes.result ?? current.result;
  const time = changes.timeSeconds ?? current.timeSeconds;
  const date = changes.date ?? current.date;
  const submittedAt = `${date}T${current.submittedAt.slice(11)}`;
  const { error } = await getSupabase().rpc("sync_update_attempt", {
    p_attempt_id: id,
    p_player_id: changes.playerId ?? current.playerId,
    p_time_hundredths: result === "dns" ? null : Math.round((time ?? 0) * 100),
    p_is_dnf: result === "dns",
    p_is_ak: changes.outOfCompetition ?? current.outOfCompetition,
    p_submitted_at: submittedAt,
    p_event_name: changes.eventName ?? current.eventName ?? null,
  });
  if (error) throw error;
}

export async function deleteRemoteAttempt(id: string) {
  const { error } = await getSupabase().rpc("sync_delete_attempt", {
    p_attempt_id: id,
  });
  if (error) throw error;
}

export async function updateRemotePlayer(id: string, changes: Partial<LiveParticipant>) {
  const { error } = await getSupabase().rpc("sync_update_player", {
    p_player_id: id,
    p_display_name: changes.name ?? "",
    p_is_ak: changes.isAk ?? false,
    p_avatar_url: changes.avatarUrl ?? null,
  });
  if (error) throw error;
}

export async function updateRemoteEvent(id: string, name: string, date: string) {
  const { error } = await getSupabase().rpc("sync_update_event", {
    p_event_id: id,
    p_name: name.trim() || null,
    p_start_date: date,
  });
  if (error) throw error;
}

export async function closeRemoteEvent(id: string, reason: "manual" | "automatic") {
  const { data, error } = await getSupabase().rpc("sync_close_event", {
    p_event_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function closeExpiredRemoteEvents() {
  const { data, error } = await getSupabase().rpc("sync_close_expired_events", {});
  if (error) throw error;
  return data;
}

export function subscribeToDataPlatform(
  onChange: () => void,
  onStatus: (status: string) => void,
  client: Pick<ReturnType<typeof getSupabase>, "channel" | "removeChannel"> = getSupabase(),
) {
  const channel = client.channel("pr6a-data-platform")
    .on("postgres_changes", { event: "*", schema: "public", table: "players" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "attempts" }, onChange)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_participants" },
      onChange,
    )
    .subscribe(onStatus);
  return () => {
    void client.removeChannel(channel);
  };
}
