import { getSupabase } from "@/lib/supabase";
import type { MostWantedEnding, MostWantedHit, MostWantedHunter } from "@/types";
import type { TrophyEventSpecialStats } from "@/types/trophyEventStats";
import { mapStatisticDashboard } from "@/services/statDashboardService";

type JsonObject = Record<string, unknown>;

const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value)
  ? value as JsonObject : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const string = (value: unknown) => typeof value === "string" ? value : null;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const nullableNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const boolean = (value: unknown) => value === true;

function resolveAvatar(path: string | null, legacy: string | null) {
  return path
    ? getSupabase().storage.from("player-avatars").getPublicUrl(path).data.publicUrl
    : legacy;
}

function mapHit(value: unknown): MostWantedHit {
  const row = object(value);
  return {
    id: string(row.id) ?? "",
    playerId: string(row.playerId),
    guestId: string(row.guestId),
    playerName: string(row.playerName) ?? "Unbekannt",
    avatarUrl: resolveAvatar(string(row.avatarPath), string(row.avatarUrl)),
    isGuest: boolean(row.isGuest),
    timeHundredths: number(row.timeHundredths),
    occurredAt: string(row.occurredAt) ?? "",
    occurredDate: string(row.occurredDate) ?? "",
    hasExactTime: boolean(row.hasExactTime),
    sourceType: "attempt",
    sourceOrder: number(row.sourceOrder),
  };
}

function mapEnding(value: unknown): MostWantedEnding {
  const row = object(value);
  const hits = array(row.hits).map(mapHit);
  return {
    ending: number(row.ending),
    label: string(row.label) ?? "00",
    achieved: boolean(row.achieved),
    hitCount: number(row.hitCount),
    participantCount: number(row.participantCount),
    playerId: string(row.playerId),
    guestId: string(row.guestId),
    playerName: string(row.playerName),
    avatarUrl: resolveAvatar(string(row.avatarPath), string(row.avatarUrl)),
    isGuest: boolean(row.isGuest),
    timeHundredths: nullableNumber(row.timeHundredths),
    occurredAt: string(row.occurredAt),
    occurredDate: string(row.occurredDate),
    hasExactTime: boolean(row.hasExactTime),
    eventId: string(row.eventId),
    sourceType: boolean(row.achieved) ? "attempt" : null,
    sourceOrder: nullableNumber(row.sourceOrder),
    sourceLabel: string(row.sourceLabel),
    additionalHits: hits.slice(1),
  };
}

function mapHunter(value: unknown): MostWantedHunter {
  const row = object(value);
  return {
    id: string(row.id) ?? "",
    playerId: string(row.playerId),
    guestId: string(row.guestId),
    playerName: string(row.playerName) ?? "Unbekannt",
    avatarUrl: resolveAvatar(string(row.avatarPath), string(row.avatarUrl)),
    isGuest: boolean(row.isGuest),
    endingCount: number(row.endingCount),
  };
}

export async function getTrophyEventSpecialStats(
  eventId: string,
): Promise<TrophyEventSpecialStats | null> {
  const { data, error } = await getSupabase().rpc("get_trophy_event_dashboard", {
    p_event_id: eventId,
  });
  if (error) throw error;
  if (data == null) return null;
  const envelope = object(data);
  const root = object(envelope.special);
  const dashboard = mapStatisticDashboard(envelope.dashboard, "special-event");
  const metrics = object(root.metrics);
  const endings = array(root.endings).map(mapEnding);
  const reached = number(metrics.distinctEndings);
  const hitCounts = endings.filter(({ achieved }) => achieved).map(({ hitCount }) => hitCount);
  const leastHits = hitCounts.length ? Math.min(...hitCounts) : 0;
  return {
    eventId: string(root.eventId) ?? eventId,
    eventName: string(root.eventName) ?? "Spieleabend",
    mostWanted: {
      endings,
      reached,
      total: 100,
      percent: reached,
      openEndings: endings.filter(({ achieved }) => !achieved).map(({ ending }) => ending),
      mostCommonEnding: nullableNumber(metrics.mostCommonEnding),
      mostCommonHits: number(metrics.mostCommonEndingHits),
      rarestAchievedEndings: endings.filter(({ achieved, hitCount }) => achieved && hitCount === leastHits)
        .map(({ ending }) => ending),
      topHunters: array(root.topHunters).map(mapHunter),
    },
    metrics: {
      bingoLines: number(metrics.bingoLines),
      distinctEndings: reached,
      snapEndings: number(metrics.snapEndings),
      matchingTimeParticipantCount: number(metrics.matchingTimeParticipantCount),
      matchingTimeHundredths: nullableNumber(metrics.matchingTimeHundredths),
      matchingTimeParticipantNames: array(metrics.matchingTimeParticipantNames)
        .flatMap((name) => typeof name === "string" ? [name] : []),
      validAttempts: number(metrics.validAttempts),
      mostCommonEnding: nullableNumber(metrics.mostCommonEnding),
      mostCommonEndingHits: number(metrics.mostCommonEndingHits),
    },
    dashboard,
  };
}
