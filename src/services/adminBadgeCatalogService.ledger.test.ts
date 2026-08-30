import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ from }) }));

import { getAdminBadgeCatalog } from "@/services/adminBadgeCatalogService";

describe("admin badge catalog ledger read", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads achievements from the persisted ledger projection", async () => {
    from.mockImplementation((name: string) => {
      const data = name === "badge_definitions" ? [{
        badge_key: "fast-bronze", family_key: null, category: "performance",
        tier: "bronze", name: "Fast Bronze", description: "Schnell",
        threshold: 500, requirement: "Unter fünf Sekunden", sort_order: 1,
        is_secret: false, badge_kind: "single", design_variant: "standard",
        scope_type: "all_time", is_active: true,
      }] : [{
        award_key: "player-1:fast-bronze", badge_key: "fast-bronze",
        player_id: "player-1", display_name: "Karl",
        awarded_at: "2026-01-01T00:00:00Z",
        metadata: { progress: 450, timeHundredths: 450 },
      }];
      const builder = {
        select: vi.fn(),
        order: vi.fn().mockResolvedValue({ data, error: null }),
      };
      builder.select.mockReturnValue(builder);
      return builder;
    });

    await expect(getAdminBadgeCatalog()).resolves.toMatchObject({
      singles: [{ achievements: [{ playerName: "Karl", timeHundredths: 450 }] }],
    });
    expect(from).toHaveBeenCalledWith("badge_definitions");
    expect(from).toHaveBeenCalledWith("player_badge_award_achievements");
    expect(from).not.toHaveBeenCalledWith("public_player_badges");
  });
});
