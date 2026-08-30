import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc }) }));

import { loadPlayerMostWantedStatistics } from "@/services/playerMostWantedService";

describe("playerMostWantedService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses one pair-scoped canonical projection and maps both values", async () => {
    rpc.mockResolvedValue({ data: [
      { player_id: "a", all_time_hits: 3, season_first_hits: 2 },
      { player_id: "b", all_time_hits: 2, season_first_hits: 0 },
    ], error: null });
    await expect(loadPlayerMostWantedStatistics(["a", "b", "a"], 2026)).resolves.toEqual({
      a: { allTimeHits: 3, seasonFirstHits: 2 },
      b: { allTimeHits: 2, seasonFirstHits: 0 },
    });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("get_player_most_wanted_statistics", {
      p_player_ids: ["a", "b"], p_season_year: 2026,
    });
  });

  it("does not issue a request without a player", async () => {
    await expect(loadPlayerMostWantedStatistics([])).resolves.toEqual({});
    expect(rpc).not.toHaveBeenCalled();
  });
});
