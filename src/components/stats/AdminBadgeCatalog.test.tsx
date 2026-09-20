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
        progress: [{ playerId: "p1", playerName: "Karl", familyKey: "wins", currentProgress: 8, timeHundredths: null }],
        stages: [stage("bronze"), stage("silver", [{ awardKey: "a1", badgeKey: "wins-silver", playerId: "p1", playerName: "Karl", awardedAt: "2026-01-02T00:00:00Z", progress: 6 }]), stage("gold"), stage("diamond")],
      }],
      singles: [{ ...stage("special"), badgeKey: "special", familyKey: null, badgeKind: "single", designVariant: "positive_special", name: "Sonderbadge" }],
    }} />);
    expect(markup.indexOf("Bronze")).toBeLessThan(markup.indexOf("Silber"));
    expect(markup.indexOf("Silber")).toBeLessThan(markup.indexOf("Gold"));
    expect(markup.indexOf("Gold")).toBeLessThan(markup.indexOf("Diamond"));
    expect(markup).toContain("Karl");
    expect(markup).toContain("6 Siege");
    expect(markup).toContain("Aktuell: 8 / 1");
    expect(markup).toContain("0 bis Gold");
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

  it("does not invent a next tier after Diamond", () => {
    const achievement = (tier: AdminBadgeCatalogEntry["tier"]) => ({ awardKey: tier, badgeKey: `wins-${tier}`, playerId: "p1", playerName: "Karl", awardedAt: "2026-01-02T00:00:00Z" });
    const markup = renderToStaticMarkup(<AdminBadgeCatalogContent catalog={{ families: [{
      familyKey: "wins", name: "Siege", category: "wins", description: "Events gewinnen",
      stages: (["bronze", "silver", "gold", "diamond"] as const).map((tier) => stage(tier, [achievement(tier)])),
      progress: [{ playerId: "p1", playerName: "Karl", familyKey: "wins", currentProgress: 30, timeHundredths: null }],
    }], singles: [] }} />);
    expect(markup).toContain("Diamond erreicht · keine weitere Stufe");
  });

  it("shows a loading state without claiming nobody earned a badge", () => {
    const markup = renderToStaticMarkup(<AdminBadgeCatalogContent catalog={{
      families: [], singles: [{ ...stage("bronze"), familyKey: null, badgeKind: "single" }],
    }} loadingAchievements />);
    expect(markup).toContain("Wird geladen");
    expect(markup).not.toContain("Noch niemand");
  });

  it("keeps line and full-card progress labels separate", () => {
    const bingoStages = (["bronze", "silver", "gold", "diamond"] as const)
      .map((tier) => ({ ...stage(tier), category: "bingo", familyKey: "bingo" }));
    const cardStages = (["bronze", "silver", "gold", "diamond"] as const)
      .map((tier) => ({ ...stage(tier), category: "bingo_completion", familyKey: "bingo-completion" }));
    const markup = renderToStaticMarkup(<AdminBadgeCatalogContent catalog={{
      families: [
        { familyKey: "bingo", name: "BINGO", category: "bingo", description: "Linien",
          stages: bingoStages, progress: [{ playerId: "p1", playerName: "Karl", familyKey: "bingo", currentProgress: 2, timeHundredths: null }] },
        { familyKey: "bingo-completion", name: "Volle Karte", category: "bingo_completion", description: "Felder",
          stages: cardStages, progress: [{ playerId: "p1", playerName: "Karl", familyKey: "bingo-completion", currentProgress: 48, timeHundredths: null }] },
      ], singles: [],
    }} />);
    expect(markup).toContain("2 Bronze-Linien");
    expect(markup).toContain("48/100 verschiedene Felder");
    expect(markup).toContain("52 Felder bis Bronze");
  });
});
