export const ALL_TIME_SEASON = "all-time" as const;
export const FIRST_SEASON_YEAR = 2026;
export const SEASON_STORAGE_KEY = "harter-kern:season";

export type SeasonSelection = typeof ALL_TIME_SEASON | number;
export type SeasonSource = "event_attempt" | "historical_attempt";
export type SeasonTheme = "all-time" | "dark-forest";

const SEASON_THEMES: Partial<Record<number, SeasonTheme>> = {
  2026: "dark-forest",
};

export function getSeasonTheme(season: SeasonSelection): SeasonTheme {
  if (season === ALL_TIME_SEASON) return "all-time";
  return SEASON_THEMES[season] ?? "dark-forest";
}

export function isSeasonSelection(value: unknown): value is SeasonSelection {
  return value === ALL_TIME_SEASON || (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= FIRST_SEASON_YEAR
  );
}

export function getSeasonOptions(
  currentYear = new Date().getFullYear(),
  selectedSeason: SeasonSelection = ALL_TIME_SEASON,
): SeasonSelection[] {
  const latestYear = Math.max(
    FIRST_SEASON_YEAR,
    currentYear,
    typeof selectedSeason === "number" ? selectedSeason : FIRST_SEASON_YEAR,
  );
  return [
    ALL_TIME_SEASON,
    ...Array.from(
      { length: latestYear - FIRST_SEASON_YEAR + 1 },
      (_, index) => FIRST_SEASON_YEAR + index,
    ),
  ];
}

export function getEventSeason(startDate: string | Date): number | null {
  const year = typeof startDate === "string"
    ? Number.parseInt(startDate.slice(0, 4), 10)
    : startDate.getFullYear();
  return Number.isInteger(year) && year >= FIRST_SEASON_YEAR ? year : null;
}

export function getAttemptSeason(
  source: SeasonSource,
  eventStartDate: string | Date | null,
): number | null {
  if (source === "historical_attempt" || eventStartDate === null) return null;
  return getEventSeason(eventStartDate);
}

export function getSeasonDateRange(year: number) {
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

export function readStoredSeason(storage: Pick<Storage, "getItem">): SeasonSelection {
  try {
    const stored = storage.getItem(SEASON_STORAGE_KEY);
    if (stored === ALL_TIME_SEASON) return ALL_TIME_SEASON;
    const year = stored === null ? Number.NaN : Number(stored);
    return isSeasonSelection(year) ? year : ALL_TIME_SEASON;
  } catch {
    return ALL_TIME_SEASON;
  }
}

export function storeSeason(
  storage: Pick<Storage, "setItem">,
  season: SeasonSelection,
) {
  try {
    storage.setItem(SEASON_STORAGE_KEY, String(season));
  } catch {
    // The in-memory selection remains usable if browser storage is unavailable.
  }
}
