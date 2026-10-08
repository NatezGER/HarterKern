import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON, type SeasonSelection } from "@/lib/season";
import { teamMilestones } from "@/constants/teamMilestones";

export const milestoneThresholds = teamMilestones.map(({ id, kind, threshold }) => ({ id, kind, threshold }));
export interface MilestoneCrossing {
  milestoneId: string;
  sourceId: string | null;
  sourceType: "attempt" | "historical_attempt" | "baseline";
  occurredDate: string | null;
  occurredAt: string | null;
  eventId: string | null;
  eventName: string | null;
  playerId: string | null;
  playerName: string | null;
  timeHundredths: number | null;
  improvementHundredths: number | null;
}

export interface TeamMilestonesSnapshot {
  season: SeasonSelection;
  validAttempts: number;
  teamTimeHundredths: number | null;
  playerCount: number;
  crossings?: MilestoneCrossing[];
}

export async function getTeamMilestones(season: SeasonSelection = ALL_TIME_SEASON): Promise<TeamMilestonesSnapshot> {
  const { data, error } = await getSupabase().rpc("get_team_milestones_snapshot_v2", {
    p_season_year: season === ALL_TIME_SEASON ? null : season,
    p_milestones: milestoneThresholds,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Team-Meilensteine fehlen.");
  const { validAttempts, teamTimeHundredths, playerCount } = data;
  if (typeof validAttempts !== "number" || typeof playerCount !== "number"
    || (teamTimeHundredths !== null && typeof teamTimeHundredths !== "number")) {
    throw new Error("Ungültige Team-Meilensteine.");
  }
  return { season, validAttempts, teamTimeHundredths, playerCount, crossings: Array.isArray(data.crossings) ? data.crossings as unknown as MilestoneCrossing[] : [] };
}
