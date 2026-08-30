import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc }) }));

import { getBadgeRarity } from "@/services/statsService";

describe("badge rarity repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads grouped rarity and recipients from one canonical RPC", async () => {
    rpc.mockResolvedValueOnce({ data: [{
      badge_key: "fast-gold", name: "Fast Gold", tier: "gold", tier_rank: 4,
      sort_order: 1, design_variant: "standard", recipient_count: 1,
      regular_player_count: 4, rarity_percent: 25,
      recipients: [{ playerId: "player-1", playerName: "Paul", avatarUrl: null }],
    }], error: null });

    await expect(getBadgeRarity()).resolves.toMatchObject([{
      key: "fast-gold", recipients: 1, percent: 25,
      recipientsList: [{ playerId: "player-1", playerName: "Paul" }],
    }]);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("get_badge_rarity");
  });
});
