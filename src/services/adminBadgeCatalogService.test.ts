import { describe, expect, it } from "vitest";
import { buildAdminBadgeCatalog } from "@/services/adminBadgeCatalogService";
import type { AdminBadgeDefinition } from "@/services/adminBadgeCatalogService";

const definition = (badgeKey: string, overrides: Partial<AdminBadgeDefinition> = {}): AdminBadgeDefinition => ({
  badgeKey, familyKey: null, category: "attempts", tier: "bronze", name: badgeKey,
  description: "Beschreibung", threshold: 1, requirement: "Anforderung", sortOrder: 1,
  isSecret: false, badgeKind: "single", designVariant: "standard", scopeType: "all_time",
  isActive: true, ...overrides,
});

describe("admin badge catalog", () => {
  it("keeps active definitions without achievements and removes inactive definitions", () => {
    const catalog = buildAdminBadgeCatalog([
      definition("never-earned"), definition("inactive", { isActive: false, sortOrder: 2 }),
    ], []);
    expect(catalog.singles.map(({ badgeKey }) => badgeKey)).toEqual(["never-earned"]);
    expect(catalog.singles[0].achievements).toEqual([]);
  });

  it("groups complete families in Bronze, Silber, Gold, Diamond order", () => {
    const family = [
      definition("wins-gold", { familyKey: "wins", badgeKind: "tiered", tier: "gold", name: "Siege Gold", sortOrder: 3 }),
      definition("wins-diamond", { familyKey: "wins", badgeKind: "tiered", tier: "diamond", name: "Siege Diamond", sortOrder: 4 }),
      definition("wins-bronze", { familyKey: "wins", badgeKind: "tiered", tier: "bronze", name: "Siege Bronze", sortOrder: 1 }),
      definition("wins-silver", { familyKey: "wins", badgeKind: "tiered", tier: "silver", name: "Siege Silber", sortOrder: 2 }),
    ];
    const catalog = buildAdminBadgeCatalog(family, []);
    expect(catalog.families).toHaveLength(1);
    expect(catalog.families[0].name).toBe("Siege");
    expect(catalog.families[0].stages.map(({ tier }) => tier)).toEqual([
      "bronze", "silver", "gold", "diamond",
    ]);
    expect(catalog.families[0].stages.every(({ achievements }) => achievements.length === 0)).toBe(true);
  });

  it("assigns achievements to the exact stage and puts singles after families", () => {
    const family = ["bronze", "silver", "gold", "diamond"].map((tier, index) =>
      definition(`wins-${tier}`, { familyKey: "wins", badgeKind: "tiered", tier: tier as AdminBadgeDefinition["tier"], sortOrder: index + 1 }));
    const groupedCatalog = buildAdminBadgeCatalog([
      ...family,
      definition("special", { familyKey: "wins", tier: "special", designVariant: "positive_special", sortOrder: 5 }),
    ], [{ awardKey: "award-1", badgeKey: "wins-silver", playerId: "player-1", playerName: "Karl", awardedAt: "2026-01-02T00:00:00Z" }]);
    expect(groupedCatalog.families[0].stages[1].achievements).toEqual([
      expect.objectContaining({ playerName: "Karl" }),
    ]);
    expect(groupedCatalog.singles.map(({ badgeKey }) => badgeKey)).toEqual(["special"]);
  });
});
