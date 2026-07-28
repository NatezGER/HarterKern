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
import type { EventParticipantPayload } from "@/types/dataPlatform";
import { getAvatarGradient, getInitials } from "@/utils/avatar";
import { hundredthsToSeconds } from "@/utils/time";

export interface DataPlatformSnapshot {
  publicData: PublicDataSnapshot;
  liveState: LiveEventState;
}

export async function loadDataPlatform(): Promise<DataPlatformSnapshot> {
  const client = getSupabase();
  const [
    publicData,
    playersResult,
    eventsResult,
    participantsResult,
    guestsResult,
    attemptsResult,
  ] =
    await Promise.all([
      loadPublicData(),
      client.from("players").select("*").eq("is_archived", false),
      client.from("events").select("*").order("started_at", { ascending: false }),
      client.from("event_participants").select("*").order("joined_at"),
      client.from("event_guests").select("*").order("joined_at"),
      client.from("attempts").select("*")
        .eq("status", "approved")
        .is("deleted_at", null)
        .order("submitted_at", { ascending: false }),
    ]);
  const error = playersResult.error ?? eventsResult.error ??
    participantsResult.error ?? guestsResult.error ?? attemptsResult.error;
  if (error) throw error;

  const playerRows = playersResult.data ?? [];
  const eventRows = eventsResult.data ?? [];
  const participantRows = participantsResult.data ?? [];
  const guestRows = guestsResult.data ?? [];
  const attemptRows = attemptsResult.data ?? [];
  const publicPlayers = new Map(publicData.players.map((player) => [player.id, player]));
  const players: LiveParticipant[] = playerRows.map((row) => {
    const publicPlayer = publicPlayers.get(row.id);
    return {
      id: row.id,
      name: row.display_name,
      kind: "permanent",
      initials: getInitials(row.display_name),
      avatarGradient: getAvatarGradient(row.id),
      avatarUrl: row.avatar_url,
      personalBest: publicPlayer?.personalBest ?? 0,
      isAk: row.is_ak,
    };
  });
  const guests: LiveParticipant[] = guestRows.map((row) => ({
    id: row.id,
    name: row.display_name,
    kind: "guest",
    eventId: row.event_id,
    initials: getInitials(row.display_name),
    avatarGradient: getAvatarGradient(row.id),
    avatarUrl: null,
    personalBest: 0,
    isAk: false,
  }));
  players.push(...guests);
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
      .map(({ player_id }) => player_id)
      .concat(guestRows.filter(({ event_id }) => event_id === row.id).map(({ id }) => id)),
    createdBy: "Supabase",
    winnerPlayerId: row.winner_player_id ?? row.winner_guest_id ?? undefined,
    endReason: row.end_reason === "automatic"
      ? "automatic" as const
      : row.end_reason === "manual" ? "manual" as const : undefined,
  }));
  const attempts = attemptRows.flatMap((row) => {
    const participantId = row.player_id ?? row.guest_id;
    if (!participantId) return [];
    const participant = playerMap.get(participantId);
    return [{
    id: row.id,
    playerId: participantId,
    participantKind: participant?.kind ?? (row.guest_id ? "guest" : "permanent"),
    eventId: row.event_id ?? undefined,
    eventName: row.event_name ?? undefined,
    result: row.is_dnf ? "dns" as const : "time" as const,
    timeSeconds: row.is_dnf ? undefined : hundredthsToSeconds(row.time_hundredths),
    date: row.submitted_at.slice(0, 10),
    submittedAt: row.submitted_at,
    outOfCompetition: row.is_ak || (participant?.isAk ?? false),
    }];
  });
  return {
    publicData,
    liveState: { version: 2, players, events, attempts },
  };
}

export async function upsertCanonicalPlayer(
  player: Pick<LiveParticipant, "name">,
  legacySourceId?: string,
) {
  const { data, error } = await getSupabase().rpc("sync_upsert_player", {
    p_display_name: player.name,
    p_is_ak: false,
    p_legacy_source_id: legacySourceId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function startRemoteEvent(
  input: StartLiveEventInput,
  legacySourceId?: string,
  timing?: { startedAt: string; endsAt: string },
) {
  const participants: EventParticipantPayload[] = input.participants.map((participant) => ({
    clientId: participant.id,
    id: participant.source === "existing-player"
      ? participant.id
      : undefined,
    name: participant.name,
    kind: participant.kind,
  }));
  const { data, error } = await getSupabase().rpc("sync_start_event_v2", {
    p_name: input.name?.trim() || null,
    p_start_date: input.date,
    p_participants: participants,
    p_started_at: timing?.startedAt ?? null,
    p_ends_at: timing?.endsAt ?? null,
    p_legacy_source_id: legacySourceId ?? null,
  });
  if (error) throw error;
  const participantIds = new Map(
    data.participants.map((participant) => [participant.clientId, participant.participantId]),
  );
  return { eventId: data.eventId, participantIds };
}

export async function importClosedRemoteEvent(
  event: LiveEventState["events"][number],
  participantIds: string[],
  guests: LiveParticipant[],
) {
  const { data, error } = await getSupabase().rpc("sync_import_closed_event_v2", {
    p_name: event.name?.trim() || null,
    p_start_date: event.date,
    p_started_at: event.startedAt,
    p_ends_at: event.endsAt,
    p_ended_at: event.endedAt ?? null,
    p_end_reason: event.endReason ?? null,
    p_participant_ids: participantIds,
    p_guests: guests.map((guest) => ({
      clientId: guest.id,
      name: guest.name,
      kind: "guest",
    })),
    p_legacy_source_id: `pr5-event:${event.id}`,
  });
  if (error) throw error;
  return {
    eventId: data.eventId,
    participantIds: new Map(
      data.participants.map((participant) => [
        participant.clientId,
        participant.participantId,
      ]),
    ),
  };
}

export async function createRemoteAttempt(
  input: AttemptInput,
  options?: { id?: string; legacySourceId?: string; submittedAt?: string },
) {
  const id = options?.id ?? crypto.randomUUID();
  const eventAttempt = Boolean(input.eventId);
  const request = eventAttempt
    ? getSupabase().rpc("sync_create_event_attempt", {
      p_id: id,
      p_event_id: input.eventId!,
      p_participant_id: input.playerId,
      p_participant_kind: input.participantKind ?? "permanent",
      p_time_hundredths: input.result === "time"
        ? Math.round((input.timeSeconds ?? 0) * 100)
        : null,
      p_is_dnf: input.result === "dns",
      p_submitted_at: options?.submittedAt ?? new Date().toISOString(),
    })
    : getSupabase().rpc("sync_create_attempt", {
    p_id: id,
    p_player_id: input.playerId,
    p_event_id: null,
    p_time_hundredths: input.result === "time"
      ? Math.round((input.timeSeconds ?? 0) * 100)
      : null,
    p_is_dnf: input.result === "dns",
    p_is_ak: input.outOfCompetition,
    p_submitted_at: options?.submittedAt ?? new Date().toISOString(),
    p_event_name: input.eventName?.trim() || null,
    p_legacy_source_id: options?.legacySourceId ?? null,
  });
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function updateRemoteAttempt(
  id: string,
  current: LiveEventState["attempts"][number],
  changes: AttemptUpdate,
  participant?: LiveParticipant,
) {
  const result = changes.result ?? current.result;
  const time = changes.timeSeconds ?? current.timeSeconds;
  const date = changes.date ?? current.date;
  const submittedAt = `${date}T${current.submittedAt.slice(11)}`;
  const nextParticipantId = changes.playerId ?? current.playerId;
  const participantKind = participant?.kind ?? current.participantKind ?? "permanent";
  const request = current.eventId
    ? getSupabase().rpc("sync_update_event_attempt", {
      p_attempt_id: id,
      p_participant_id: nextParticipantId,
      p_participant_kind: participantKind,
      p_time_hundredths: result === "dns" ? null : Math.round((time ?? 0) * 100),
      p_is_dnf: result === "dns",
      p_submitted_at: submittedAt,
    })
    : getSupabase().rpc("sync_update_attempt", {
    p_attempt_id: id,
    p_player_id: nextParticipantId,
    p_time_hundredths: result === "dns" ? null : Math.round((time ?? 0) * 100),
    p_is_dnf: result === "dns",
    p_is_ak: changes.outOfCompetition ?? current.outOfCompetition,
    p_submitted_at: submittedAt,
    p_event_name: changes.eventName ?? current.eventName ?? null,
  });
  const { error } = await request;
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
    p_is_ak: false,
    p_avatar_url: changes.avatarUrl ?? null,
  });
  if (error) throw error;
}

export async function addExistingEventPlayer(eventId: string, playerId: string) {
  const { data, error } = await getSupabase().rpc("sync_add_existing_event_player", {
    p_event_id: eventId,
    p_player_id: playerId,
  });
  if (error) throw error;
  return data;
}

export async function createEventPlayer(eventId: string, name: string) {
  const { data, error } = await getSupabase().rpc("sync_create_event_player", {
    p_event_id: eventId,
    p_display_name: name,
  });
  if (error) throw error;
  return data;
}

export async function addEventGuest(eventId: string, name: string) {
  const { data, error } = await getSupabase().rpc("sync_add_event_guest", {
    p_event_id: eventId,
    p_display_name: name,
  });
  if (error) throw error;
  return data;
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
    .on("postgres_changes", { event: "*", schema: "public", table: "event_guests" }, onChange)
    .subscribe(onStatus);
  return () => {
    void client.removeChannel(channel);
  };
}
