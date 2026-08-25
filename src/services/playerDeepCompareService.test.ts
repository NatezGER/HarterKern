import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  timeline: vi.fn(),
  progression: vi.fn(),
  legacySection: vi.fn().mockRejectedValue({ code: "57014", message: "canceling statement due to statement timeout" }),
}));

vi.mock("@/services/historyProfileService", () => ({
  getPlayerCompareTimeline: mocks.timeline,
  getPlayerPersonalProgression: mocks.progression,
}));
vi.mock("@/services/playerProfileService", () => ({
  loadPlayerProfileSection: mocks.legacySection,
}));

import {
  loadPlayerCompareProgression,
  loadPlayerCompareSequence,
} from "@/services/playerDeepCompareService";

describe("playerDeepCompareService isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.timeline.mockResolvedValue([
      attempt("a", 1, 290, "2026-01-01T00:01:00Z"),
      attempt("b", 1, 310, "2026-01-01T00:02:00Z"),
    ]);
    mocks.progression.mockImplementation((playerId: string) => Promise.resolve([{
      id: `${playerId}-pb`, timeHundredths: 300, achievedAt: "2026-01-01",
    }]));
  });

  it("regresses the former Badge-RPC timeout by removing badge and prestige dependencies", async () => {
    await expect(loadPlayerCompareSequence("a", "b", 2026)).resolves.toMatchObject({
      playerA: { longestSub3Streak: 1 },
      playerB: { longestSub3Streak: 0 },
    });
    expect(mocks.legacySection).not.toHaveBeenCalled();
    expect(mocks.timeline).toHaveBeenCalledTimes(1);
  });

  it("passes the established season scope into the single paired timeline read", async () => {
    await loadPlayerCompareSequence("a", "b", 2027);
    expect(mocks.timeline).toHaveBeenCalledWith("a", "b", 2027);
  });

  it("keeps one progression series when the other player request fails", async () => {
    mocks.progression.mockImplementation((playerId: string) => playerId === "a"
      ? Promise.reject(new Error("progression unavailable"))
      : Promise.resolve([{ id: "b-pb" }]));
    await expect(loadPlayerCompareProgression("a", "b", 2026)).resolves.toEqual({
      playerA: null,
      playerB: [{ id: "b-pb" }],
      playerAError: true,
      playerBError: false,
    });
  });

  it("allows progression to succeed even when the sequence read fails", async () => {
    mocks.timeline.mockRejectedValueOnce(new Error("timeline unavailable"));
    await expect(loadPlayerCompareSequence("a", "b", 2030)).rejects.toThrow("timeline unavailable");
    await expect(loadPlayerCompareProgression("a", "b", 2030)).resolves.toMatchObject({
      playerAError: false,
      playerBError: false,
    });
  });
});

function attempt(playerId: string, attemptNumber: number, timeHundredths: number, submittedAt: string) {
  return {
    id: `${playerId}-${attemptNumber}`, eventId: "shared", eventName: "Shared",
    eventDate: "2026-01-01", eventEndAt: "2026-01-01T00:10:00Z", playerId,
    timeHundredths, isDnf: false, submittedAt, attemptNumber,
  };
}
