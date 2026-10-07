import { getSupabase } from "@/lib/supabase";
import { ALL_TIME_SEASON, type SeasonSelection } from "@/lib/season";

export interface TeamMilestonesSnapshot {
  season: SeasonSelection;
  validAttempts: number;
  teamTimeHundredths: number | null;
  playerCount: number;
}

export async function getTeamMilestones(season: SeasonSelection = ALL_TIME_SEASON): Promise<TeamMilestonesSnapshot> {
  const { data, error } = await getSupabase().rpc("get_team_milestones_snapshot", {
    p_season_year: season === ALL_TIME_SEASON ? null : season,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Team-Meilensteine fehlen.");
  const { validAttempts, teamTimeHundredths, playerCount } = data;
  if (typeof validAttempts !== "number" || typeof playerCount !== "number"
    || (teamTimeHundredths !== null && typeof teamTimeHundredths !== "number")) {
    throw new Error("Ungültige Team-Meilensteine.");
  }
  return { season, validAttempts, teamTimeHundredths, playerCount };
}
