import { TROPHY_COMPETITIONS } from "../../supabase/functions/admin-media/trophySlots";

export interface TrophyEventCompetition {
  key: string;
  year: number;
  name: string;
}

export const TROPHY_EVENT_COMPETITIONS: TrophyEventCompetition[] = TROPHY_COMPETITIONS
  .filter(({ key }) => key !== "season")
  .flatMap((competition) => competition.editions.map((edition) => ({
    key: competition.key,
    year: edition.year,
    name: `${competition.name} ${edition.year}`,
  })));

export const SELECTABLE_TROPHY_EVENT_COMPETITIONS = TROPHY_COMPETITIONS
  .filter(({ key }) => key !== "season")
  .flatMap((competition) => competition.editions
    .filter(({ selectableForNewEvents }) => selectableForNewEvents)
    .map((edition) => ({
      key: competition.key,
      year: edition.year,
      name: `${competition.name} ${edition.year}`,
    })));

export function trophyCompetitionId(competition: Pick<TrophyEventCompetition, "key" | "year">) {
  return `${competition.key}:${competition.year}`;
}

export function findSelectableTrophyCompetition(id: string): TrophyEventCompetition | null {
  return SELECTABLE_TROPHY_EVENT_COMPETITIONS.find((competition) => trophyCompetitionId(competition) === id) ?? null;
}

export function trophyCompetitionName(key: string | null, year: number | null) {
  return TROPHY_EVENT_COMPETITIONS.find((competition) => competition.key === key && competition.year === year)?.name ?? null;
}

export function competitionAfterTrophyToggle(
  enabled: boolean,
  competition: TrophyEventCompetition | null,
) {
  return enabled ? competition : null;
}
