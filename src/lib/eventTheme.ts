export type EventTheme = "default" | "denmark";

export interface ThemeableEvent {
  awardsTrophies?: boolean | null;
  trophyCompetitionKey?: string | null;
}

/** An event title or date is not a competition identifier. */
export function resolveEventTheme(event: ThemeableEvent | null | undefined): EventTheme {
  return event?.awardsTrophies === true && event.trophyCompetitionKey === "denmark"
    ? "denmark"
    : "default";
}
