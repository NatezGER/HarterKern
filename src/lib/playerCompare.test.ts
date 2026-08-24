import { describe, expect, it } from "vitest";
import {
  buildCompareUrl,
  createHeadToHeadSummary,
  evaluateCompareWinner,
  getComparePlayerOptions,
  replaceComparePlayer,
  visibleHeadToHeadEvents,
} from "@/lib/playerCompare";
import type { PlayerEventSummary } from "@/types/historyProfiles";

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

describe("head-to-head calculation", () => {
  it("counts only closed shared events with a valid time on both sides", () => {
    const playerA = [
      history("closed", "2026-01-01", 300),
      history("active", "2026-01-02", 290),
      history("dnf-a", "2026-01-03", null, 0, 2),
      history("dnf-b", "2026-01-04", 280),
    ];
    const playerB = [
      history("closed", "2026-01-01", 320),
      history("active", "2026-01-02", 310),
      history("dnf-a", "2026-01-03", 300),
      history("dnf-b", "2026-01-04", null, 0, 1),
    ];
    const summary = createHeadToHeadSummary(
      playerA,
      playerB,
      new Set(["closed", "dnf-a", "dnf-b"]),
    );
    expect(summary.events.map(({ eventId }) => eventId)).toEqual(["closed"]);
    expect(summary.playerAWins).toBe(1);
    expect(summary.totalDuels).toBe(1);
  });

  it("uses the lower event best and records exact times as ties", () => {
    const summary = createHeadToHeadSummary(
      [history("a-win", "2026-01-01", 299), history("tie", "2026-01-02", 310)],
      [history("a-win", "2026-01-01", 301), history("tie", "2026-01-02", 310)],
      new Set(["a-win", "tie"]),
    );
    expect(summary.playerAWins).toBe(1);
    expect(summary.playerBWins).toBe(0);
    expect(summary.ties).toBe(1);
    expect(summary.events.find(({ eventId }) => eventId === "tie")?.winner).toBe("tie");
  });

  it("keeps All-Time complete and filters a selected season by event date", () => {
    const playerA = [history("2026", "2026-06-01", 300), history("2027", "2027-06-01", 310)];
    const playerB = [history("2026", "2026-06-01", 320), history("2027", "2027-06-01", 300)];
    const closed = new Set(["2026", "2027"]);
    expect(createHeadToHeadSummary(playerA, playerB, closed).totalDuels).toBe(2);
    expect(createHeadToHeadSummary(playerA, playerB, closed, 2026).events)
      .toMatchObject([{ eventId: "2026" }]);
  });

  it("finds closest decided duel and biggest win without treating a tie as closest", () => {
    const playerA = [
      history("tie", "2026-01-03", 300),
      history("closest", "2026-01-02", 300),
      history("biggest", "2026-01-01", 300),
    ];
    const playerB = [
      history("tie", "2026-01-03", 300),
      history("closest", "2026-01-02", 301),
      history("biggest", "2026-01-01", 381),
    ];
    const summary = createHeadToHeadSummary(playerA, playerB, new Set(["tie", "closest", "biggest"]));
    expect(summary.closestDuel?.eventId).toBe("closest");
    expect(summary.closestDuel?.differenceHundredths).toBe(1);
    expect(summary.biggestWin?.eventId).toBe("biggest");
    expect(summary.biggestWin?.differenceHundredths).toBe(81);
  });

  it("calculates current and longest streaks and lets a tie end the active streak", () => {
    const ids = ["old-a-1", "old-a-2", "b-1", "tie", "new-a"];
    const dates = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"];
    const timesA = [300, 300, 320, 300, 300];
    const timesB = [310, 310, 300, 300, 310];
    const playerA = ids.map((id, index) => history(id, dates[index], timesA[index]));
    const playerB = ids.map((id, index) => history(id, dates[index], timesB[index]));
    const summary = createHeadToHeadSummary(playerA, playerB, new Set(ids));
    expect(summary.currentStreak).toEqual({ winners: ["a"], length: 1 });
    expect(summary.longestStreak).toEqual({ winners: ["a"], length: 2 });

    const latestTie = createHeadToHeadSummary(
      [...playerA, history("latest-tie", "2026-01-06", 300)],
      [...playerB, history("latest-tie", "2026-01-06", 300)],
      new Set([...ids, "latest-tie"]),
    );
    expect(latestTie.currentStreak).toBeNull();
  });

  it("sorts latest duels first and exposes five until history is expanded", () => {
    const ids = Array.from({ length: 7 }, (_, index) => `event-${index + 1}`);
    const playerA = ids.map((id, index) => history(id, `2026-01-0${index + 1}`, 300));
    const playerB = ids.map((id, index) => history(id, `2026-01-0${index + 1}`, 310));
    const summary = createHeadToHeadSummary(playerA, playerB, new Set(ids));
    expect(summary.events[0].eventId).toBe("event-7");
    expect(visibleHeadToHeadEvents(summary.events, false)).toHaveLength(5);
    expect(visibleHeadToHeadEvents(summary.events, true)).toHaveLength(7);
  });
});

function history(
  eventId: string,
  eventDate: string,
  bestHundredths: number | null,
  validAttempts = bestHundredths == null ? 0 : 1,
  dnfCount = 0,
): PlayerEventSummary {
  return {
    eventId,
    eventName: `Event ${eventId}`,
    eventDate,
    bestHundredths,
    rank: null,
    attempts: validAttempts + dnfCount,
    validAttempts,
    dnfCount,
  };
}
