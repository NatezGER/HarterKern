export type EventTheme = "default" | "denmark";

export interface ThemeableEvent {
  awardsTrophies?: boolean | null;
  trophyCompetitionKey?: string | null;
}

/** Competition identity is authoritative; an event title never activates a theme. */
export function resolveEventTheme(event: ThemeableEvent | null | undefined): EventTheme {
  return event?.awardsTrophies === true && event.trophyCompetitionKey === "denmark"
    ? "denmark"
    : "default";
}
