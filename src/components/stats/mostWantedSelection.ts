import type { SeasonSelection } from "@/lib/season";
import type { MostWantedEnding } from "@/types";

export function selectionAfterSeasonChange(
  selected: MostWantedEnding | null,
  previousSeason: SeasonSelection,
  nextSeason: SeasonSelection,
) {
  return previousSeason === nextSeason ? selected : null;
}
