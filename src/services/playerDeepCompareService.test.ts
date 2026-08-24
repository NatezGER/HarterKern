import { beforeEach, describe, expect, it, vi } from "vitest";

const getAttempts = vi.hoisted(() => vi.fn());
const loadSection = vi.hoisted(() => vi.fn());

vi.mock("@/services/historyProfileService", () => ({
  getPlayerCompareAttempts: getAttempts,
}));
vi.mock("@/services/playerProfileService", () => ({
  loadPlayerProfileSection: loadSection,
}));

import { loadPlayerDeepCompare } from "@/services/playerDeepCompareService";

describe("playerDeepCompareService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAttempts.mockImplementation((playerId: string) => Promise.resolve([
      { id: `${playerId}-old`, eventId: "old", timeHundredths: 280, isDnf: false, submittedAt: "2025-01-01", attemptNumber: 1, isPersonalBest: false },
      { id: `${playerId}-new-1`, eventId: "new", timeHundredths: 290, isDnf: false, submittedAt: "2026-01-01", attemptNumber: 1, isPersonalBest: false },
      { id: `${playerId}-new-2`, eventId: "new", timeHundredths: null, isDnf: true, submittedAt: "2026-01-02", attemptNumber: 2, isPersonalBest: false },
    ]));
    loadSection.mockImplementation((section: string, playerId: string, options?: { seasonYear?: number }) => {
      if (section === "events") return Promise.resolve([
        { eventId: "old", eventDate: "2025-01-01" },
        { eventId: "new", eventDate: "2026-01-01" },
      ]);
      if (section === "performance") return Promise.resolve({ timeHundredths: options?.seasonYear ? [290] : [280, 290], thresholds: [] });
      if (section === "progression") return Promise.resolve({ personal: [{ id: `${playerId}-${options?.seasonYear ?? "all"}` }], worldRecords: [] });
      if (section === "badges") return Promise.resolve([]);
      if (section === "prestige") return Promise.resolve({ pbCount: 0, largestPbImprovementHundredths: null, averagePbImprovementHundredths: null, worldRecordCount: 0, worldRecordDays: 0, longestWorldRecordDays: 0, visibleBadgeCount: 0 });
      throw new Error(`Unexpected section ${section}`);
    });
  });

  it("loads one bundled attempt read per player and reuses profile sections", async () => {
    const result = await loadPlayerDeepCompare("a", "b");
    expect(getAttempts).toHaveBeenCalledTimes(2);
    expect(getAttempts).toHaveBeenCalledWith("a");
    expect(getAttempts).toHaveBeenCalledWith("b");
    expect(loadSection).toHaveBeenCalledTimes(10);
    expect(result.playerA?.statistics.attemptNumbers).toHaveLength(2);
    expect(result.playerB?.statistics.eventDominance.eventsWithAttempts).toBe(2);
  });

  it("applies the event season before streak and attempt-number calculations", async () => {
    const result = await loadPlayerDeepCompare("a", "b", 2026);
    expect(result.playerA?.statistics.attemptNumbers).toEqual([
      { attemptNumber: 1, samples: 1, validAttempts: 1, dnfCount: 0, averageHundredths: 290 },
      { attemptNumber: 2, samples: 1, validAttempts: 0, dnfCount: 1, averageHundredths: null },
    ]);
    expect(result.playerA?.statistics.consistency.noDnf).toEqual({ longest: 1, current: 0 });
    expect(loadSection).toHaveBeenCalledWith("performance", "a", { seasonYear: 2026 });
    expect(loadSection).toHaveBeenCalledWith("progression", "b", { seasonYear: 2026 });
  });

  it("skips reads for an unselected side", async () => {
    const result = await loadPlayerDeepCompare("a", null, 2026);
    expect(result.playerA).not.toBeNull();
    expect(result.playerB).toBeNull();
    expect(getAttempts).toHaveBeenCalledTimes(1);
  });
});
