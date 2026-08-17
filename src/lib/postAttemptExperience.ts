import { getEventSeason } from "@/lib/season";
import {
  isEventEligibleLiveAttempt,
  isOfficialLiveAttempt,
  isOfficialLiveParticipant,
} from "@/lib/liveEventCalculations";
import type {
  BadgeUnlockCelebration,
  LiveAttempt,
  LiveEvent,
  LiveEventState,
  LiveParticipant,
  PostAttemptResult,
  RecordCelebration,
} from "@/types/liveEvent";

const hundredths = (seconds: number) => Math.round(seconds * 100);

function isOfficialAttempt(attempt: LiveAttempt, state: LiveEventState) {
  return attempt.result === "time" && attempt.timeSeconds != null &&
    isOfficialLiveAttempt(
      attempt,
      state.players.find(({ id }) => id === attempt.playerId),
    );
}

function minimumHundredths(values: number[]) {
  return values.length ? Math.min(...values.map(hundredths)) : null;
}

export function derivePostAttemptResult(input: {
  before: LiveEventState;
  event: LiveEvent;
  player: LiveParticipant;
  attempt: LiveAttempt;
}): PostAttemptResult {
  const { before, event, player, attempt } = input;
  if (attempt.result === "dns" || attempt.timeSeconds == null) {
    return {
      attemptId: attempt.id,
      playerName: player.name,
      result: "dns",
      primaryKind: "dnf",
      primaryMessage: "Versuch gespeichert",
      achievements: [],
    };
  }

  const attemptHundredths = hundredths(attempt.timeSeconds);
  const eventEligible = isEventEligibleLiveAttempt(attempt, player);
  const eventBest = minimumHundredths(before.attempts.flatMap((item) =>
    item.eventId === event.id && item.result === "time" && item.timeSeconds != null &&
      isEventEligibleLiveAttempt(item, before.players.find(({ id }) => id === item.playerId))
      ? [item.timeSeconds!] : [],
  ));
  const official = isOfficialLiveAttempt(attempt, player);
  const previousPb = official ? minimumHundredths([
    ...(player.personalBest > 0 ? [player.personalBest] : []),
    ...before.attempts.flatMap((item) =>
      item.playerId === player.id && isOfficialAttempt(item, before)
        ? [item.timeSeconds!] : [],
    ),
  ]) : null;
  const previousWr = official ? minimumHundredths([
    ...before.players.flatMap((item) =>
      isOfficialLiveParticipant(item) && item.personalBest > 0 ? [item.personalBest] : [],
    ),
    ...before.attempts.flatMap((item) =>
      isOfficialAttempt(item, before) ? [item.timeSeconds!] : [],
    ),
  ]) : null;
  const seasonYear = getEventSeason(event.date);
  const previousSeasonRecord = official && seasonYear != null
    ? minimumHundredths(before.attempts.flatMap((item) =>
      getEventSeason(item.date) === seasonYear && isOfficialAttempt(item, before)
        ? [item.timeSeconds!] : [],
    ))
    : null;

  const isEventBest = eventEligible && (eventBest == null || attemptHundredths < eventBest);
  const tiesEventBest = eventEligible && eventBest != null && attemptHundredths === eventBest;
  const isPb = official && (previousPb == null || attemptHundredths < previousPb);
  const isSeasonRecord = official && seasonYear != null &&
    (previousSeasonRecord == null || attemptHundredths < previousSeasonRecord);
  const isWorldRecord = official && (previousWr == null || attemptHundredths < previousWr);
  const eventAchievement = isEventBest ? "Eventführung" : tiesEventBest
    ? "Event-Bestzeit eingestellt" : null;

  let primaryKind: PostAttemptResult["primaryKind"] = "normal";
  let primaryMessage = !eventEligible || eventBest == null ? "Versuch gespeichert"
    : `${((attemptHundredths - eventBest) / 100).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} s zu langsam`;
  if (tiesEventBest) {
    primaryKind = "event-tie";
    primaryMessage = "Event-Bestzeit eingestellt";
  }
  if (isEventBest) {
    primaryKind = "event-best";
    primaryMessage = "Neue Event-Bestzeit";
  }
  if (isPb) {
    primaryKind = "pb";
    primaryMessage = "Neue persönliche Bestzeit";
  }
  if (isSeasonRecord) {
    primaryKind = "season-record";
    primaryMessage = `Neuer Saisonrekord ${seasonYear}`;
  }
  if (isWorldRecord) {
    primaryKind = "wr";
    primaryMessage = "NEUER WELTREKORD";
  }

  const achievements = [
    isSeasonRecord && primaryKind !== "season-record" ? `Neuer Saisonrekord ${seasonYear}` : null,
    isPb && primaryKind !== "pb" ? "Neue persönliche Bestzeit" : null,
    eventAchievement && !["event-best", "event-tie"].includes(primaryKind)
      ? eventAchievement : null,
  ].filter((value): value is string => Boolean(value));

  return {
    attemptId: attempt.id,
    playerName: player.name,
    result: "time",
    time: attempt.timeSeconds,
    primaryKind,
    primaryMessage,
    achievements,
    improvementHundredths: isPb && previousPb != null ? previousPb - attemptHundredths : null,
    eventDeltaHundredths: eventEligible && !isEventBest && !tiesEventBest && eventBest != null
      ? attemptHundredths - eventBest : null,
    seasonYear,
    previousRecordTime: primaryKind === "wr" && previousWr != null ? previousWr / 100
      : primaryKind === "season-record" && previousSeasonRecord != null
        ? previousSeasonRecord / 100
        : primaryKind === "pb" && previousPb != null ? previousPb / 100 : undefined,
  };
}

export function recordCelebrationFor(result: PostAttemptResult): RecordCelebration | null {
  if (result.result !== "time" || result.time == null) return null;
  const kind = result.primaryKind === "wr" ? "wr"
    : result.primaryKind === "season-record" ? "season"
      : result.primaryKind === "pb" ? "pb" : null;
  return kind ? {
    kind,
    playerName: result.playerName,
    time: result.time,
    previousTime: result.previousRecordTime,
    seasonYear: kind === "season" ? result.seasonYear ?? undefined : undefined,
  } : null;
}

export function getPostAttemptSurface(input: {
  result: PostAttemptResult | null;
  record: RecordCelebration | null;
  badge: BadgeUnlockCelebration | null;
}) {
  if (input.result) return "result" as const;
  if (input.record) return "record" as const;
  if (input.badge) return "badge" as const;
  return "live" as const;
}

export function getPostAttemptInitial(reducedMotion: boolean) {
  return reducedMotion ? false : { opacity: 0, y: 24, scale: 0.96 };
}
