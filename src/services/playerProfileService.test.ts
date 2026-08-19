import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  core: vi.fn(),
  season: vi.fn(),
  badges: vi.fn(),
  trophies: vi.fn(),
  prestige: vi.fn(),
  progression: vi.fn(),
  performance: vi.fn(),
  attemptNumbers: vi.fn(),
  events: vi.fn(),
  bingo: vi.fn(),
}));

vi.mock("@/services/historyProfileService", () => ({
  getPlayerProfileCore: mocks.core,
  getPlayerSeasonProfile: mocks.season,
  getPlayerBadges: mocks.badges,
  getPlayerTrophies: mocks.trophies,
  getPlayerPrestige: mocks.prestige,
  getPlayerProgression: mocks.progression,
  getPlayerTimePerformance: mocks.performance,
  getPlayerAttemptNumbers: mocks.attemptNumbers,
  getPlayerEventHistory: mocks.events,
  getPlayerBingo: mocks.bingo,
}));

import {
  clearPlayerProfileCache,
  invalidatePlayerProfileSections,
  loadPlayerProfileSection,
  profileSectionsForDataGroups,
} from "@/services/playerProfileService";

describe("player profile section loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPlayerProfileCache();
    mocks.core.mockResolvedValue({ id: "player-1" });
    mocks.season.mockResolvedValue({ rank: 1 });
    mocks.badges.mockResolvedValue([]);
    mocks.trophies.mockResolvedValue([]);
    mocks.prestige.mockResolvedValue({});
    mocks.progression.mockResolvedValue({ personal: [], worldRecords: [] });
    mocks.performance.mockResolvedValue({ thresholds: [] });
    mocks.attemptNumbers.mockResolvedValue([]);
    mocks.events.mockResolvedValue([]);
    mocks.bingo.mockResolvedValue({ fields: [], summary: {} });
  });

  it("keeps a badge failure independent from the core profile", async () => {
    mocks.badges.mockRejectedValueOnce(new Error("statement timeout"));
    const core = loadPlayerProfileSection("core", "player-1");
    const badges = loadPlayerProfileSection("badges", "player-1");
    await expect(core).resolves.toEqual({ id: "player-1" });
    await expect(badges).rejects.toThrow("statement timeout");
  });

  it("isolates season profile cache entries by year", async () => {
    await loadPlayerProfileSection("season", "player-1", { seasonYear: 2026 });
    await loadPlayerProfileSection("season", "player-1", { seasonYear: 2027 });
    expect(mocks.season).toHaveBeenNthCalledWith(1, "player-1", 2026);
    expect(mocks.season).toHaveBeenNthCalledWith(2, "player-1", 2027);
    await loadPlayerProfileSection("badges", "player-1");
    expect(mocks.badges).toHaveBeenCalledWith("player-1");
  });

  it("loads time performance with the selected season scope", async () => {
    await loadPlayerProfileSection("performance", "player-1", { seasonYear: 2026 });
    expect(mocks.performance).toHaveBeenCalledWith("player-1", 2026);
  });

  it("starts optional sections independently", async () => {
    let resolveBadges!: (value: never[]) => void;
    let resolveTrophies!: (value: never[]) => void;
    mocks.badges.mockReturnValueOnce(new Promise((resolve) => { resolveBadges = resolve; }));
    mocks.trophies.mockReturnValueOnce(new Promise((resolve) => { resolveTrophies = resolve; }));
    const badges = loadPlayerProfileSection("badges", "player-1");
    const trophies = loadPlayerProfileSection("trophies", "player-1");
    expect(mocks.badges).toHaveBeenCalledOnce();
    expect(mocks.trophies).toHaveBeenCalledOnce();
    resolveBadges([]);
    resolveTrophies([]);
    await Promise.all([badges, trophies]);
  });

  it("waits only prestige for badges and keeps other sections parallel", async () => {
    let resolveBadges!: (value: Array<{ key: string }>) => void;
    mocks.badges.mockReturnValueOnce(new Promise((resolve) => { resolveBadges = resolve; }));
    const badges = loadPlayerProfileSection("badges", "player-1");
    const prestige = loadPlayerProfileSection("prestige", "player-1");
    const progression = loadPlayerProfileSection("progression", "player-1");

    expect(mocks.badges).toHaveBeenCalledOnce();
    expect(mocks.prestige).not.toHaveBeenCalled();
    expect(mocks.progression).toHaveBeenCalledOnce();

    resolveBadges([{ key: "one" }, { key: "two" }]);
    await badges;
    await prestige;
    await progression;

    expect(mocks.prestige).toHaveBeenCalledWith("player-1", 2);
    expect(mocks.progression).toHaveBeenCalledOnce();
  });

  it("deduplicates in-flight reads and reuses a successful cache entry", async () => {
    let resolveBadges!: (value: never[]) => void;
    mocks.badges.mockReturnValueOnce(new Promise((resolve) => { resolveBadges = resolve; }));
    const first = loadPlayerProfileSection("badges", "player-1");
    const second = loadPlayerProfileSection("badges", "player-1");
    expect(first).toBe(second);
    resolveBadges([]);
    await first;
    await loadPlayerProfileSection("badges", "player-1");
    expect(mocks.badges).toHaveBeenCalledOnce();
  });

  it("forces only the retried section to load again", async () => {
    await loadPlayerProfileSection("badges", "player-1");
    await loadPlayerProfileSection("trophies", "player-1");
    await loadPlayerProfileSection("badges", "player-1", { force: true });
    expect(mocks.badges).toHaveBeenCalledTimes(2);
    expect(mocks.trophies).toHaveBeenCalledOnce();
  });

  it("does not cache a request invalidated while it is in flight", async () => {
    let resolveFirst!: (value: never[]) => void;
    mocks.badges.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));
    const first = loadPlayerProfileSection("badges", "player-1");
    invalidatePlayerProfileSections(["badges"], "player-1");
    const second = loadPlayerProfileSection("badges", "player-1");
    resolveFirst([]);
    await Promise.all([first, second]);
    expect(mocks.badges).toHaveBeenCalledTimes(2);
  });

  it("maps invalidation to the affected profile sections only", () => {
    expect(profileSectionsForDataGroups(["profile-badges", "profile-prestige"]))
      .toEqual(["badges", "prestige"]);
    expect(profileSectionsForDataGroups(["event-detail", "profile-events"]))
      .toEqual(["events"]);
  });
});
