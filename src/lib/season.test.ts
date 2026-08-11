import { describe, expect, it, vi } from "vitest";
import {
  ALL_TIME_SEASON,
  FIRST_SEASON_YEAR,
  getAttemptSeason,
  getEventSeason,
  getSeasonOptions,
  readStoredSeason,
  SEASON_STORAGE_KEY,
  storeSeason,
} from "@/lib/season";

describe("season foundation", () => {
  it("starts with All-Time and generates calendar-year seasons from 2026", () => {
    expect(FIRST_SEASON_YEAR).toBe(2026);
    expect(getSeasonOptions(2025)).toEqual([ALL_TIME_SEASON, 2026]);
    expect(getSeasonOptions(2027)).toEqual([ALL_TIME_SEASON, 2026, 2027]);
  });

  it("assigns an event completely to the year of its start date", () => {
    expect(getEventSeason("2026-12-31")).toBe(2026);
    expect(getAttemptSeason("event_attempt", "2026-12-31")).toBe(2026);
    expect(getEventSeason("2025-12-31")).toBeNull();
  });

  it("never assigns historical attempts to a season", () => {
    expect(getAttemptSeason("historical_attempt", "2026-06-01")).toBeNull();
  });

  it("defaults invalid or absent storage to All-Time and persists a selection", () => {
    const getItem = vi.fn().mockReturnValue(null);
    expect(readStoredSeason({ getItem })).toBe(ALL_TIME_SEASON);
    getItem.mockReturnValue("2025");
    expect(readStoredSeason({ getItem })).toBe(ALL_TIME_SEASON);
    getItem.mockReturnValue("2027");
    expect(readStoredSeason({ getItem })).toBe(2027);

    const setItem = vi.fn();
    storeSeason({ setItem }, 2026);
    expect(setItem).toHaveBeenCalledWith(SEASON_STORAGE_KEY, "2026");
  });
});
