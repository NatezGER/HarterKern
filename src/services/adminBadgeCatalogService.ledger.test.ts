import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ from, rpc }) }));

import { getAdminBadgeAchievements, getAdminBadgeCatalog, getAdminBadgeProgress, withAdminBadgeAchievements, withAdminBadgeProgress } from "@/services/adminBadgeCatalogService";

describe("admin badge catalog ledger read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: [], error: null });
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
  });

  it("loads achievements from the persisted ledger projection", async () => {
    const base = await getAdminBadgeCatalog();
    expect(base.singles[0].achievements).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
    const withAchievements = withAdminBadgeAchievements(base, await getAdminBadgeAchievements());
    expect(withAchievements).toMatchObject({
      singles: [{ achievements: [{ playerName: "Karl", timeHundredths: 450 }] }],
    });
    expect(rpc).not.toHaveBeenCalled();
    const catalog = withAdminBadgeProgress(withAchievements, await getAdminBadgeProgress());
    expect(catalog.warnings).toEqual([]);
    expect(from).toHaveBeenCalledWith("badge_definitions");
    expect(from).toHaveBeenCalledWith("player_badge_award_achievements");
    expect(from).not.toHaveBeenCalledWith("public_player_badges");
    expect(rpc).toHaveBeenCalledWith("get_admin_badge_family_progress");
  });

  it("keeps definitions and achievements when family progress fails", async () => {
    rpc.mockImplementation((name: string) => name === "get_admin_badge_family_progress"
      ? Promise.resolve({ data: null, error: new Error("timeout") })
      : Promise.resolve({ data: [], error: null }));
    const base = withAdminBadgeAchievements(await getAdminBadgeCatalog(), await getAdminBadgeAchievements());
    const catalog = withAdminBadgeProgress(base, await getAdminBadgeProgress());
    expect(catalog.singles[0].achievements).toHaveLength(1);
    expect(catalog.warnings).toContain("Familienfortschritt ist vorübergehend nicht verfügbar.");
  });

  it("keeps the catalog when rivalry progress rejects", async () => {
    rpc.mockImplementation((name: string) => name === "get_rivalry_badge_progress"
      ? Promise.reject(new Error("timeout"))
      : Promise.resolve({ data: [], error: null }));
    const base = await getAdminBadgeCatalog();
    const catalog = withAdminBadgeProgress(base, await getAdminBadgeProgress());
    expect(catalog.singles).toHaveLength(1);
    expect(catalog.warnings).toContain("Rivalitätsfortschritt ist vorübergehend nicht verfügbar.");
  });

  it("keeps definitions when achievements fail", async () => {
    from.mockImplementation((name: string) => {
      const builder = { select: vi.fn(), order: vi.fn().mockResolvedValue(name === "badge_definitions"
        ? { data: [{ badge_key: "fast-bronze", family_key: null, category: "performance", tier: "bronze",
          name: "Fast Bronze", description: "Schnell", threshold: 500, requirement: "Unter fünf Sekunden",
          sort_order: 1, is_secret: false, badge_kind: "single", design_variant: "standard",
          scope_type: "all_time", is_active: true }], error: null }
        : { data: null, error: new Error("timeout") }) };
      builder.select.mockReturnValue(builder);
      return builder;
    });
    const catalog = withAdminBadgeAchievements(await getAdminBadgeCatalog(), await getAdminBadgeAchievements());
    expect(catalog.singles[0].badgeKey).toBe("fast-bronze");
    expect(catalog.singles[0].achievements).toEqual([]);
    expect(catalog.warnings).toContain("Vergaben konnten nicht geladen werden.");
  });
});
