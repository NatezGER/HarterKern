import { describe, expect, it } from "vitest";
import type { HistoricalAttempt } from "@/types/liveEvent";
import { sortHistoricalAttempts } from "@/lib/historicalAttempts";

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
    expect(sortHistoricalAttempts(attempts).map(({ id }) => id))
      .toEqual(["first", "second"]);
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

  it("uses source priority and source id when date and source order are identical", () => {
    const base: Omit<HistoricalAttempt, "id" | "sourcePriority" | "sourceAttemptId"> = {
      playerId: "paul",
      displayName: "Paul",
      date: "2025-09-05",
      timeSeconds: 2.32,
      isGuest: false,
      outOfCompetition: false,
      sortOrder: 29,
    };
    const attempts: HistoricalAttempt[] = [
      { ...base, id: "third", sourcePriority: 1, sourceAttemptId: "b" },
      { ...base, id: "second", sourcePriority: 1, sourceAttemptId: "a" },
      { ...base, id: "first", sourcePriority: 0, sourceAttemptId: "z" },
    ];
    expect(sortHistoricalAttempts(attempts).map(({ id }) => id))
      .toEqual(["first", "second", "third"]);
  });

  it("falls back to the stable id when old rows have no source metadata", () => {
    const attempts: HistoricalAttempt[] = ["c", "a", "b"].map((id) => ({
      id,
      playerId: "paul",
      displayName: "Paul",
      date: "2025-09-05",
      timeSeconds: 2.32,
      isGuest: false,
      outOfCompetition: false,
      sortOrder: 29,
    }));
    expect(sortHistoricalAttempts(attempts).map(({ id }) => id))
      .toEqual(["a", "b", "c"]);
    expect(sortHistoricalAttempts([...attempts].reverse()).map(({ id }) => id))
      .toEqual(["a", "b", "c"]);
  });
});
