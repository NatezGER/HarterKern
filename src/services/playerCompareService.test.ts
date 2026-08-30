import { beforeEach, describe, expect, it, vi } from "vitest";

const loadSection = vi.hoisted(() => vi.fn());
const getClosedEventIds = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/services/playerProfileService", () => ({
  loadPlayerProfileSection: loadSection,
}));
vi.mock("@/services/historyProfileService", () => ({
  getClosedEventIds,
}));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc }) }));

import {
  loadPlayerCompareCore,
  loadPlayerCompareSpeed,
  loadPlayerHeadToHead,
} from "@/services/playerCompareService";

describe("playerCompareService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClosedEventIds.mockResolvedValue([]);
    rpc.mockResolvedValue({ data: [{ event_id: null, direct_takeovers: 0, is_rivalry_event: false, common_events: 0, rivalry_events: 0, total_direct_takeovers: 0, first_rivalry_date: null, last_rivalry_date: null }], error: null });
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

  it("loads two cached histories and one bundled closed-event lookup", async () => {
    const event = (eventId: string, bestHundredths: number) => ({
      eventId, eventName: eventId, eventDate: "2026-06-01", bestHundredths,
      rank: null, attempts: 1, validAttempts: 1, dnfCount: 0,
    });
    loadSection.mockImplementation((section: string, playerId: string) => {
      if (section !== "events") return Promise.resolve(null);
      return Promise.resolve(playerId === "a"
        ? [event("shared", 300), event("only-a", 290)]
        : [event("shared", 320), event("only-b", 280)]);
    });
    getClosedEventIds.mockResolvedValue(["shared"]);
    rpc.mockResolvedValue({ data: [{ event_id: "shared", direct_takeovers: 3, is_rivalry_event: true, common_events: 1, rivalry_events: 1, total_direct_takeovers: 3, first_rivalry_date: "2026-06-01", last_rivalry_date: "2026-06-01" }], error: null });

    const result = await loadPlayerHeadToHead("a", "b", 2026);

    expect(loadSection).toHaveBeenCalledWith("events", "a");
    expect(loadSection).toHaveBeenCalledWith("events", "b");
    expect(getClosedEventIds).toHaveBeenCalledWith(["shared"]);
    expect(result).toMatchObject({ playerAWins: 1, totalDuels: 1, rivalry: { rivalryEvents: 1, directTakeovers: 3 }, events: [{ isRivalryEvent: true, directTakeovers: 3 }] });
  });

  it("skips every H2H read until two different players are selected", async () => {
    await expect(loadPlayerHeadToHead("a", "a")).resolves.toMatchObject({ totalDuels: 0 });
    expect(loadSection).not.toHaveBeenCalled();
    expect(getClosedEventIds).not.toHaveBeenCalled();
  });
});
