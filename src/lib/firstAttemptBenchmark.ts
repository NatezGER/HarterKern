import { isEventEligibleLiveAttempt } from "@/lib/liveEventCalculations";
import type { LiveAttempt, LiveParticipant } from "@/types/liveEvent";

export function visibleFirstAttemptBenchmark(
  player: LiveParticipant,
  eventAttempts: LiveAttempt[],
  bestHundredths: number | undefined,
) {
  if (bestHundredths == null || player.kind !== "permanent" || player.isAk) return null;
  const hasValidTime = eventAttempts.some((attempt) =>
    attempt.playerId === player.id && attempt.result === "time" &&
    attempt.timeSeconds != null && isEventEligibleLiveAttempt(attempt, player));
  return hasValidTime ? null : bestHundredths;
}
