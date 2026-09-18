import { describe, expect, it } from "vitest";
import { resolveEventTheme } from "@/lib/eventTheme";
import { getSeasonTheme } from "@/lib/season";

describe("Denmark event context", () => {
  it("uses structured trophy competition data for current and historical events", () => {
    const laterEdition = { awardsTrophies: true, trophyCompetitionKey: "denmark", year: 2027 };
    expect(resolveEventTheme({ awardsTrophies: true, trophyCompetitionKey: "denmark" })).toBe("denmark");
    expect(resolveEventTheme(laterEdition)).toBe("denmark");
    expect(resolveEventTheme({ awardsTrophies: false, trophyCompetitionKey: "denmark" })).toBe("default");
    expect(resolveEventTheme({ awardsTrophies: true, trophyCompetitionKey: "season" })).toBe("default");
    expect(resolveEventTheme(null)).toBe("default");
  });

  it("ignores event names and leaves season selection independent", () => {
    const namedOnly = { awardsTrophies: false, trophyCompetitionKey: null, name: "Dänemark Finale" };
    expect(resolveEventTheme(namedOnly)).toBe("default");
    expect(getSeasonTheme(2026)).toBe("dark-forest");
  });
});
