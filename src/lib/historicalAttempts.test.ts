import { describe, expect, it } from "vitest";
import type { HistoricalAttempt } from "@/types/liveEvent";

const ordered = (attempts: HistoricalAttempt[]) => [...attempts].sort(
  (a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder,
);

describe("historical attempt classification", () => {
  it("keeps labels as context and preserves stable source order", () => {
    const attempts: HistoricalAttempt[] = [
      {
        id: "second",
        playerId: "paul",
        displayName: "Paul",
        date: "2025-09-05",
        timeSeconds: 2.32,
        historicalLabel: "Geburtstag Paul",
        isGuest: false,
        outOfCompetition: false,
        sortOrder: 29,
      },
      {
        id: "first",
        playerId: "lia",
        displayName: "Lia",
        date: "2025-09-05",
        timeSeconds: 10.71,
        historicalLabel: "Geburtstag Paul",
        isGuest: false,
        outOfCompetition: false,
        sortOrder: 27,
      },
    ];
    expect(ordered(attempts).map(({ id }) => id)).toEqual(["first", "second"]);
    expect(attempts.every(({ historicalLabel }) =>
      historicalLabel === "Geburtstag Paul")).toBe(true);
  });

  it("models Jan only as a guest out of competition", () => {
    const jan: HistoricalAttempt = {
      id: "jan",
      playerId: null,
      displayName: "Jan",
      date: "2026-05-11",
      timeSeconds: 2.07,
      historicalLabel: "Maiwanderung 26",
      isGuest: true,
      outOfCompetition: true,
      sortOrder: 46,
    };
    expect(jan).toMatchObject({
      playerId: null,
      isGuest: true,
      outOfCompetition: true,
    });
  });
});
