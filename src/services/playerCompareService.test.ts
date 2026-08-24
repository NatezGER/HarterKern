import { beforeEach, describe, expect, it, vi } from "vitest";

const loadSection = vi.hoisted(() => vi.fn());
vi.mock("@/services/playerProfileService", () => ({
  loadPlayerProfileSection: loadSection,
}));

import { loadPlayerCompareCore, loadPlayerCompareSpeed } from "@/services/playerCompareService";

describe("playerCompareService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSection.mockImplementation((section: string, playerId: string, options?: { seasonYear?: number }) => {
      if (section === "core") return Promise.resolve({ id: playerId, name: playerId, isAk: false, rank: 1 });
      if (section === "season") return Promise.resolve({ rank: playerId === "a" ? 2 : 4, seasonYear: options?.seasonYear });
      return Promise.resolve({ thresholds: [{ seconds: 5, percent: playerId === "a" ? 90 : 80 }] });
    });
  });

  it("uses all-time core values without season reads", async () => {
    const result = await loadPlayerCompareCore("a", "b");
    expect(result.playerA?.statistics).toMatchObject({ id: "a", rank: 1 });
    expect(loadSection).not.toHaveBeenCalledWith("season", expect.anything(), expect.anything());
  });

  it("uses season-aware profile values for both players", async () => {
    const result = await loadPlayerCompareCore("a", "b", 2026);
    expect(result.playerA?.statistics).toMatchObject({ rank: 2, seasonYear: 2026 });
    expect(result.playerB?.statistics).toMatchObject({ rank: 4, seasonYear: 2026 });
    expect(loadSection).toHaveBeenCalledWith("season", "a", { seasonYear: 2026 });
    expect(loadSection).toHaveBeenCalledWith("season", "b", { seasonYear: 2026 });
  });

  it("maps speed data to the correct side and season", async () => {
    const result = await loadPlayerCompareSpeed("a", "b", 2026);
    expect(result.playerA?.thresholds[0].percent).toBe(90);
    expect(result.playerB?.thresholds[0].percent).toBe(80);
    expect(loadSection).toHaveBeenCalledWith("performance", "a", { seasonYear: 2026 });
    expect(loadSection).toHaveBeenCalledWith("performance", "b", { seasonYear: 2026 });
  });
});
