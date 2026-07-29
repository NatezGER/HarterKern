import type { LiveEventState, LiveParticipant } from "@/types/liveEvent";

const isString = (value: unknown): value is string => typeof value === "string";
const knownIds = new Map([
  ["paul", "10000000-0000-0000-0000-000000000001"],
  ["max", "10000000-0000-0000-0000-000000000002"],
  ["jonas", "10000000-0000-0000-0000-000000000003"],
  ["tobi", "10000000-0000-0000-0000-000000000004"],
  ["fabi", "10000000-0000-0000-0000-000000000005"],
  ["luke", "10000000-0000-0000-0000-000000000006"],
  ["niko", "10000000-0000-0000-0000-000000000007"],
  ["marc", "10000000-0000-0000-0000-000000000008"],
  ["dave", "10000000-0000-0000-0000-000000000009"],
  ["sven", "10000000-0000-0000-0000-000000000010"],
  ["chris", "10000000-0000-0000-0000-000000000011"],
  ["ben", "10000000-0000-0000-0000-000000000012"],
]);

const canonicalId = (player: LiveParticipant) =>
  knownIds.get(player.name.trim().toLocaleLowerCase("de-DE")) ?? player.id;

export function isLiveEventState(value: unknown): value is LiveEventState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<LiveEventState>;
  if (state.version !== 2 || !Array.isArray(state.players)) return false;
  if (!Array.isArray(state.events) || !Array.isArray(state.attempts) ||
    !Array.isArray(state.historicalAttempts)) return false;
  const playersValid = state.players.every((player) =>
    isString(player.id) && isString(player.name) &&
    ["permanent", "guest"].includes(player.kind) &&
    typeof player.personalBest === "number" && typeof player.isAk === "boolean",
  );
  const playerIds = new Set(state.players.flatMap((player) =>
    player && typeof player === "object" && isString(player.id) ? [player.id] : [],
  ));
  const eventsValid = state.events.every((event) =>
    isString(event.id) && isString(event.startedAt) && isString(event.endsAt) &&
    ["active", "completed"].includes(event.status) && Array.isArray(event.participantIds) &&
    event.participantIds.every((id) => isString(id) && playerIds.has(id)),
  );
  const eventIds = new Set(state.events.flatMap((event) =>
    event && typeof event === "object" && isString(event.id) ? [event.id] : [],
  ));
  const attemptsValid = state.attempts.every((attempt) =>
    isString(attempt.id) && isString(attempt.playerId) &&
    playerIds.has(attempt.playerId) &&
    (!attempt.eventId || eventIds.has(attempt.eventId)) &&
    ["time", "dns"].includes(attempt.result) && isString(attempt.submittedAt) &&
    (attempt.result === "dns" || (
      typeof attempt.timeSeconds === "number" &&
      attempt.timeSeconds > 0 &&
      attempt.timeSeconds <= 300
    )),
  );
  const historicalAttemptsValid = state.historicalAttempts.every((attempt) =>
    isString(attempt.id) && isString(attempt.displayName) &&
    isString(attempt.date) && typeof attempt.timeSeconds === "number" &&
    attempt.timeSeconds > 0 && attempt.timeSeconds <= 300 &&
    typeof attempt.isGuest === "boolean" &&
    typeof attempt.outOfCompetition === "boolean" &&
    typeof attempt.sortOrder === "number",
  );
  return playersValid && eventsValid && attemptsValid && historicalAttemptsValid &&
    playerIds.size === state.players.length &&
    eventIds.size === state.events.length &&
    new Set(state.attempts.map(({ id }) => id)).size === state.attempts.length;
}

function migrateVersionOne(value: unknown): LiveEventState | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as {
    version?: number;
    events?: Array<Record<string, unknown>>;
    attempts?: Array<Record<string, unknown>>;
  };
  if (legacy.version !== 1 || !Array.isArray(legacy.events) || !Array.isArray(legacy.attempts)) {
    return null;
  }
  const players = new Map<string, LiveParticipant>();
  const idMap = new Map<string, string>();
  legacy.events.forEach((event) => {
    const eventPlayers = Array.isArray(event.participants)
      ? event.participants as LiveParticipant[]
      : [];
    eventPlayers.forEach((player) => {
      const id = canonicalId(player);
      idMap.set(player.id, id);
      players.set(id, {
        ...player,
        id,
        kind: player.isAk ? "guest" : "permanent",
      });
    });
  });
  const events = legacy.events.flatMap((event) => {
    if (!isString(event.id) || !isString(event.date) ||
      !isString(event.startedAt) || !isString(event.endsAt)) return [];
    return [{
      id: event.id,
      name: isString(event.name) ? event.name : undefined,
      date: event.date,
      startedAt: event.startedAt,
      endsAt: event.endsAt,
      endedAt: isString(event.endedAt) ? event.endedAt : undefined,
      status: event.status === "completed" ? "completed" as const : "active" as const,
      participantIds: (Array.isArray(event.participantIds) ? event.participantIds : [])
        .flatMap((id) => isString(id) ? [idMap.get(id) ?? id] : []),
      createdBy: "Live-Modus",
      winnerPlayerId: isString(event.winnerPlayerId)
        ? idMap.get(event.winnerPlayerId) ?? event.winnerPlayerId
        : undefined,
      endReason: event.endReason === "automatic" ? "automatic" as const : event.endReason === "manual" ? "manual" as const : undefined,
    }];
  });
  const attempts = legacy.attempts.flatMap((attempt) => {
    if (attempt.status === "rejected" || !isString(attempt.id) ||
      !isString(attempt.playerId) || !isString(attempt.submittedAt)) return [];
    const event = events.find(({ id }) => id === attempt.eventId);
    return [{
      id: attempt.id,
      playerId: idMap.get(attempt.playerId) ?? attempt.playerId,
      eventId: isString(attempt.eventId) ? attempt.eventId : undefined,
      result: attempt.result === "dns" ? "dns" as const : "time" as const,
      timeSeconds: typeof attempt.timeSeconds === "number" ? attempt.timeSeconds : undefined,
      date: event?.date ?? attempt.submittedAt.slice(0, 10),
      submittedAt: attempt.submittedAt,
      outOfCompetition: Boolean(attempt.outOfCompetition),
    }];
  });
  return {
    version: 2,
    players: [...players.values()],
    events,
    attempts,
    historicalAttempts: [],
  };
}

export function parseMigratableLiveEventState(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" &&
      (parsed as { version?: number }).version === 2) {
      const legacyV2 = parsed as LiveEventState;
      const normalized: LiveEventState = {
        ...legacyV2,
        players: Array.isArray(legacyV2.players)
          ? legacyV2.players.map((player) => ({
            ...player,
            kind: player.kind ?? (player.isAk ? "guest" : "permanent"),
          }))
          : [],
        historicalAttempts: Array.isArray(legacyV2.historicalAttempts)
          ? legacyV2.historicalAttempts
          : [],
      };
      if (isLiveEventState(normalized)) return normalized;
    }
    const migrated = migrateVersionOne(parsed);
    return migrated && isLiveEventState(migrated) ? migrated : null;
  } catch {
    return null;
  }
}
