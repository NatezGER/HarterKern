import { beerMilestones } from "@/constants/teamMilestones";
import { resolveMilestoneProgress } from "@/lib/teamMilestoneProgress";
export const BEER_LITERS_PER_VALID_ATTEMPT = 0.2;
export const beerVolumeMilestones = beerMilestones.map(m => ({ ...m, liters: m.threshold, label: m.title, emoji: "🍺" }));

export function beerLitersForAttempts(validAttemptCount: number) {
  return Math.max(0, validAttemptCount) * BEER_LITERS_PER_VALID_ATTEMPT;
}

export function countBeerEligibleEventAttempts(attempts: Array<{
  isGuest: boolean;
  isAk: boolean;
  isDnf: boolean;
  timeHundredths: number | null;
}>) {
  return attempts.filter((attempt) => !attempt.isGuest && !attempt.isAk
    && !attempt.isDnf && attempt.timeHundredths != null).length;
}


export function resolveBeerVolumeMilestone(validAttemptCount: number) {
  const liters = beerLitersForAttempts(validAttemptCount);
  const result = resolveMilestoneProgress({ definitions: beerVolumeMilestones, currentValue: liters, direction: "up" });
  return { liters, reached: result.achievedMilestone, next: result.nextMilestone,
    progress: result.progress * 100, remainingLiters: result.remaining ?? 0 };
}
