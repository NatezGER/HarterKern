import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc }) }));
import { loadPlayerBadgePrestige } from "@/services/playerBadgePrestigeService";

describe("loadPlayerBadgePrestige", () => {
  beforeEach(() => rpc.mockReset());
  it("maps the cumulative family counts and emerald specials", async () => {
    rpc.mockResolvedValue({ data: [{ player_id: "p1", at_least_bronze: 4, at_least_silver: 3, at_least_gold: 2, at_least_diamond: 1, emerald: 2 }], error: null });
    await expect(loadPlayerBadgePrestige(["p1", "p1"])).resolves.toEqual({ p1: { atLeastBronze: 4, atLeastSilver: 3, atLeastGold: 2, atLeastDiamond: 1, emerald: 2 } });
    expect(rpc).toHaveBeenCalledWith("get_player_badge_prestige", { p_player_ids: ["p1"] });
  });
});
