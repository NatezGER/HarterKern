import { describe, expect, it } from "vitest";
import { mergePatchForRun } from "@/hooks/dataPlatformRunGuard";
import type { DataPlatformSnapshot } from "@/services/dataPlatformRepository";

const snapshot = (reached: number): DataPlatformSnapshot => ({
  publicData: {
    players: [], leaderboard: [], dailyWinners: [], worldRecordHistory: [],
    seasonRecord: null, events: [], statistics: [], recentAttempts: [], activities: [],
    milestones: [], badgeRarity: [], leagueTimeStatistics: {
      totalValidTimes: 0, mostCommonTimeHundredths: null, mostCommonTimeHits: 0,
      mostCommonTimeParticipants: 0, smoothTimeCount: 0,
      mostCommonSmoothHundredths: null, mostCommonSmoothHits: 0,
      topSmoothPlayerId: null, topSmoothPlayerName: null, topSmoothPlayerAvatarUrl: null,
      topSmoothPlayerHits: 0, latestSmoothPlayerName: null,
      latestSmoothHundredths: null, latestSmoothAt: null, latestSmoothDate: null,
      latestSmoothHasExactTime: false, thresholds: [],
    },
    mostWanted: { endings: [], reached, total: 100, percent: reached,
      openEndings: [], mostCommonEnding: null, mostCommonHits: 0,
      rarestAchievedEndings: [] },
  },
  liveState: { version: 2, players: [], events: [], attempts: [], historicalAttempts: [] },
});

describe("season request merge protection", () => {
  it("discards a late All-Time result after the 2026 result", () => {
    const season2026 = mergePatchForRun(snapshot(0), {
      publicData: { mostWanted: snapshot(26).publicData.mostWanted },
    }, 2, 2);
    const lateAllTime = mergePatchForRun(season2026, {
      publicData: { mostWanted: snapshot(99).publicData.mostWanted },
    }, 1, 2);
    expect(lateAllTime.publicData.mostWanted.reached).toBe(26);
  });

  it("discards a late season result after switching back to All-Time", () => {
    const allTime = mergePatchForRun(snapshot(0), {
      publicData: { mostWanted: snapshot(99).publicData.mostWanted },
    }, 3, 3);
    const lateSeason = mergePatchForRun(allTime, {
      publicData: { mostWanted: snapshot(26).publicData.mostWanted },
    }, 2, 3);
    expect(lateSeason.publicData.mostWanted.reached).toBe(99);
  });

  it("protects required page snapshots across repeated fast season switches", () => {
    const statistic = (value: string) => ({
      id: "events",
      label: "Events",
      value,
      change: "",
      icon: "trophy" as const,
    });
    const season2026 = mergePatchForRun(snapshot(0), {
      publicData: { statistics: [statistic("2026")] },
    }, 4, 4);
    const lateAllTime = mergePatchForRun(season2026, {
      publicData: { statistics: [statistic("Ewig-alt")] },
    }, 3, 4);
    const allTimeAgain = mergePatchForRun(lateAllTime, {
      publicData: { statistics: [statistic("Ewig-neu")] },
    }, 5, 5);
    const lateSeason = mergePatchForRun(allTimeAgain, {
      publicData: { statistics: [statistic("2026-alt")] },
    }, 4, 5);
    expect(lateSeason.publicData.statistics[0]?.value).toBe("Ewig-neu");
  });
});
