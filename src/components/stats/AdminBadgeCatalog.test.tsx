import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminBadgeCatalogContent } from "@/components/stats/AdminBadgeCatalog";
import type { AdminBadgeCatalogEntry } from "@/services/adminBadgeCatalogService";

vi.mock("@/hooks/useAwardAssets", () => ({
  useAwardAssetUrl: (assetId: string) => `https://example.test/${assetId}.webp`,
}));

const stage = (tier: AdminBadgeCatalogEntry["tier"], achievements: AdminBadgeCatalogEntry["achievements"] = []): AdminBadgeCatalogEntry => ({
  badgeKey: `wins-${tier}`, familyKey: "wins", category: "wins", tier,
  name: `Siege ${tier}`, description: "Events gewinnen", threshold: 1,
  requirement: `${tier} erreichen`, sortOrder: 1, isSecret: false, badgeKind: "tiered",
  designVariant: "standard", scopeType: "all_time", isActive: true, achievements,
});

describe("AdminBadgeCatalogContent", () => {
  it("shows all family stages, their players and an explicit empty state before singles", () => {
    const markup = renderToStaticMarkup(<AdminBadgeCatalogContent catalog={{
      families: [{
        familyKey: "wins", name: "Siege", category: "wins", description: "Events gewinnen",
        stages: [stage("bronze"), stage("silver", [{ awardKey: "a1", badgeKey: "wins-silver", playerId: "p1", playerName: "Karl", awardedAt: "2026-01-02T00:00:00Z", progress: 6 }]), stage("gold"), stage("diamond")],
      }],
      singles: [{ ...stage("special"), badgeKey: "special", familyKey: null, badgeKind: "single", designVariant: "positive_special", name: "Sonderbadge" }],
    }} />);
    expect(markup.indexOf("Bronze")).toBeLessThan(markup.indexOf("Silber"));
    expect(markup.indexOf("Silber")).toBeLessThan(markup.indexOf("Gold"));
    expect(markup.indexOf("Gold")).toBeLessThan(markup.indexOf("Diamond"));
    expect(markup).toContain("Karl");
    expect(markup).toContain("6 Siege");
    expect(markup).toContain("Noch niemand");
    expect(markup).toContain('src="https://example.test/badge:wins-bronze.webp"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('decoding="async"');
    expect(markup).toContain("overflow-hidden");
    expect(markup.indexOf("Badge-Familien")).toBeLessThan(markup.indexOf("Einzel- &amp; Sonderbadges"));
  });

  it("uses emerald only for positive specials and not for wood", () => {
    const positive = { ...stage("special"), badgeKey: "positive", familyKey: null, badgeKind: "single" as const, designVariant: "positive_special" as const };
    const wood = { ...positive, badgeKey: "wood", name: "Holz", designVariant: "consolation" as const };
    const markup = renderToStaticMarkup(<AdminBadgeCatalogContent catalog={{ families: [], singles: [positive, wood] }} />);
    expect(markup.match(/border-emerald-300\/30/g)).toHaveLength(1);
    expect(markup).toContain("border-amber-700/30");
  });
});
