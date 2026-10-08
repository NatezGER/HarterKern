import { beerMilestones, teamTimeMilestones } from "@/constants/teamMilestones";
import { beerLitersForAttempts } from "@/lib/beerVolume";
import { resolveMilestoneProgress } from "@/lib/teamMilestoneProgress";
import type { TeamMilestonesSnapshot } from "@/services/teamMilestonesService";
export function resolveTeamMilestones(snapshot: TeamMilestonesSnapshot) {
  const liters = beerLitersForAttempts(snapshot.validAttempts);
  const seconds = snapshot.teamTimeHundredths == null ? null : snapshot.teamTimeHundredths/100;
  const qualified = seconds != null && seconds > 0;
  return { liters, seconds, qualified,
    beer: resolveMilestoneProgress({ definitions: beerMilestones, currentValue: liters, direction: "up" }),
    time: resolveMilestoneProgress({ definitions: teamTimeMilestones, currentValue: qualified ? seconds : null, direction: "down", initialValue: 50 }),
  };
}
