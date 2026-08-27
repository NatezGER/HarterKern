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
  it("keeps every definition when no badge has been achieved", () => {
    const catalog = buildAdminBadgeCatalog([
      definition("earned"), definition("never-earned", { sortOrder: 2 }),
    ], []);
    expect(catalog.map(({ badgeKey }) => badgeKey)).toEqual(["earned", "never-earned"]);
    expect(catalog.every(({ achievements }) => achievements.length === 0)).toBe(true);
  });

  it("joins compact achievement details without duplicating definitions", () => {
    const catalog = buildAdminBadgeCatalog([definition("wins")], [{
      awardKey: "award-1", badgeKey: "wins", playerId: "player-1",
      playerName: "Karl", awardedAt: "2026-01-02T00:00:00Z",
    }]);
    expect(catalog).toHaveLength(1);
    expect(catalog[0].achievements).toEqual([expect.objectContaining({ playerName: "Karl" })]);
  });
});
