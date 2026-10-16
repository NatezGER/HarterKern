import { isOfficialLiveAttempt, isOfficialLiveParticipant } from "@/lib/liveEventCalculations";
import type { LiveAttempt, LiveParticipant } from "@/types/liveEvent";
import type { SweetSpot } from "@/services/sweetSpotService";

export function visibleSweetSpot(
  player: LiveParticipant, eventId: string, attempts: LiveAttempt[],
  sweetSpot: SweetSpot | undefined,
): SweetSpot | null {
  if (!eventId || !sweetSpot || !isOfficialLiveParticipant(player)) return null;
  // LiveState is already approved + nondeleted, with archived players removed
  // by loadLiveState. Match the chart's event/player/non-AK filter here.
  // DNF (and null-time approved rows) consume ordinals; do not filter on result.
  // row_number(submitted_at,id) is contiguous, so the next ordinal is count+1,
  // regardless of the array's order. This is not standing.attempts (includes AK).
  const next = 1 + attempts.filter(attempt =>
    attempt.eventId === eventId && attempt.playerId === player.id &&
    isOfficialLiveAttempt(attempt, player)).length;
  return sweetSpot.nextAttemptNumber === next && sweetSpot.attemptNumber === next
    ? sweetSpot : null;
}
