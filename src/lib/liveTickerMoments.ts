import { getAttemptMilestones, isEventEligibleLiveAttempt } from "./liveEventCalculations";
import { getEventSeason } from "./season";
import type { RecordKind } from "./awardAssets";
import type { LiveAttempt, LiveEvent, LiveEventState } from "@/types/liveEvent";

/** Bounded highlights from the already loaded live snapshot; no extra reads. */
export function getLiveTickerMoments(state: LiveEventState, event: LiveEvent, now = new Date()) {
  const milestones = getAttemptMilestones(state.players, state.attempts);
  const season = getEventSeason(event.date);
  const seasonMilestones = getAttemptMilestones(state.players, state.attempts.filter(a => getEventSeason(a.date) === season));
  const eligible = state.attempts.filter(a => a.eventId === event.id && a.result === "time" && a.timeSeconds != null &&
    isEventEligibleLiveAttempt(a, state.players.find(p => p.id === a.playerId)))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
  const latest = new Map<RecordKind, LiveAttempt>();
  let best = Infinity;
  eligible.forEach((attempt, index) => {
    const today = new Date(attempt.submittedAt).toDateString() === now.toDateString();
    const time = attempt.timeSeconds!;
    const historical = state.historicalAttempts.filter(h => !h.isGuest && !h.outOfCompetition && h.date <= attempt.date);
    if (today) {
      const flags = milestones.get(attempt.id);
      if (flags?.isPersonalBest && historical.filter(h => h.playerId === attempt.playerId).every(h => time < h.timeSeconds)) latest.set("pb", attempt);
      if (flags?.isWorldRecord && historical.every(h => time < h.timeSeconds)) latest.set("wr", attempt);
      if (season != null && seasonMilestones.get(attempt.id)?.isWorldRecord) latest.set("sr", attempt);
      if (index >= 1 && time < best) latest.set("eb", attempt);
    }
    best = Math.min(best, time);
  });
  return [...latest].map(([kind, attempt]) => ({ kind, attempt }));
}
