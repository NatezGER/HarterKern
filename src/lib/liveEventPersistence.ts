import type { LiveEventState } from "@/types/liveEvent";

const isString = (value: unknown): value is string => typeof value === "string";

export function isLiveEventState(value: unknown): value is LiveEventState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<LiveEventState>;
  if (state.version !== 1 || !["admin", "user"].includes(state.role ?? "")) return false;
  if (!Array.isArray(state.events) || !Array.isArray(state.attempts)) return false;
  const validEvents = state.events.every((event) =>
    event &&
    isString(event.id) &&
    isString(event.date) &&
    isString(event.startedAt) &&
    isString(event.endsAt) &&
    ["active", "completed"].includes(event.status) &&
    Array.isArray(event.participantIds) &&
    Array.isArray(event.participants) &&
    event.participants.every((player) =>
      isString(player.id) &&
      isString(player.name) &&
      typeof player.personalBest === "number" &&
      typeof player.isAk === "boolean",
    ),
  );
  const validAttempts = state.attempts.every((attempt) =>
    attempt &&
    isString(attempt.id) &&
    isString(attempt.playerId) &&
    isString(attempt.eventId) &&
    ["time", "dns"].includes(attempt.result) &&
    (attempt.status == null || ["pending", "approved", "rejected"].includes(attempt.status)) &&
    isString(attempt.submittedAt),
  );
  return validEvents && validAttempts;
}

export function parseLiveEventState(raw: string | null, fallback: () => LiveEventState) {
  if (!raw) return fallback();
  try {
    const parsed: unknown = JSON.parse(raw);
    return isLiveEventState(parsed) ? parsed : fallback();
  } catch {
    return fallback();
  }
}
