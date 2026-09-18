import { describe, expect, it } from "vitest";
import { resolveEventTheme } from "@/lib/eventTheme";
import { getSeasonTheme } from "@/lib/season";

describe("event competition theme", () => {
  it("activates only from structured Denmark trophy metadata, for any edition", () => {
    const laterEdition = { awardsTrophies: true, trophyCompetitionKey: "denmark", year: 2027 };
    expect(resolveEventTheme({ awardsTrophies: true, trophyCompetitionKey: "denmark" }))
      .toBe("denmark");
    expect(resolveEventTheme(laterEdition))
      .toBe("denmark");
    expect(resolveEventTheme({ awardsTrophies: false, trophyCompetitionKey: "denmark" }))
      .toBe("default");
    expect(resolveEventTheme({ awardsTrophies: true, trophyCompetitionKey: "season" }))
      .toBe("default");
    expect(resolveEventTheme({ awardsTrophies: true, trophyCompetitionKey: null }))
      .toBe("default");
    expect(resolveEventTheme(null)).toBe("default");
  });

  it("does not infer Denmark from an event name or override the seasonal theme", () => {
    const ordinaryEvent = { awardsTrophies: false, trophyCompetitionKey: null, name: "Dänemark Finale" };
    expect(resolveEventTheme(ordinaryEvent))
      .toBe("default");
    expect(getSeasonTheme(2026)).toBe("dark-forest");
    expect(resolveEventTheme({ awardsTrophies: true, trophyCompetitionKey: "denmark" }))
      .toBe("denmark");
    expect(getSeasonTheme(2026)).toBe("dark-forest");
  });
});
