import { describe, expect, it } from "vitest";
import {
  buildCompareUrl,
  evaluateCompareWinner,
  getComparePlayerOptions,
  replaceComparePlayer,
} from "@/lib/playerCompare";

describe("player compare rules", () => {
  it("supports lower-is-better and higher-is-better metrics", () => {
    expect(evaluateCompareWinner(2, 3, "lower")).toBe("a");
    expect(evaluateCompareWinner(8, 5, "higher")).toBe("a");
    expect(evaluateCompareWinner(8, 9, "higher")).toBe("b");
  });

  it("does not invent a winner for ties or missing values", () => {
    expect(evaluateCompareWinner(4, 4, "lower")).toBeNull();
    expect(evaluateCompareWinner(null, 4, "lower")).toBeNull();
    expect(evaluateCompareWinner(4, null, "higher")).toBeNull();
  });

  it("builds a reload-safe profile compare target without duplicate players", () => {
    expect(buildCompareUrl("paul", "lars")).toBe("/compare?playerA=paul&playerB=lars");
    expect(buildCompareUrl("paul", "paul")).toBe("/compare?playerA=paul");
    expect(buildCompareUrl(null, null)).toBe("/compare");
  });

  it("replaces only the selected side and blocks a duplicate", () => {
    const current = new URLSearchParams("playerA=paul&playerB=lars");
    expect(replaceComparePlayer(current, "a", "anna", "lars").toString())
      .toBe("playerA=anna&playerB=lars");
    expect(replaceComparePlayer(current, "a", "lars", "lars").toString())
      .toBe("playerA=paul&playerB=lars");
  });

  it("offers only regular opponents and excludes the current player", () => {
    const base = { name: "", initials: "", avatarGradient: "", avatarUrl: null, personalBest: 0, average: 0, attempts: 0, validAttempts: 0, dnfCount: 0, dailyWins: 0, trend: "same" as const };
    const players = [
      { ...base, id: "current", isAk: false, isArchived: false },
      { ...base, id: "opponent", isAk: false, isArchived: false },
      { ...base, id: "ak", isAk: true, isArchived: false },
      { ...base, id: "archived", isAk: false, isArchived: true },
    ];
    expect(getComparePlayerOptions(players, "current").map(({ id }) => id))
      .toEqual(["opponent"]);
  });
});
