import { describe, expect, it } from "vitest";
import {
  badgeAssetId,
  awardAssetType,
  groupBadgeDefinitions,
  medalAssetId,
  resolveAwardAsset,
  TROPHY_ASSET_DEFINITIONS,
  trophyAssetId,
  trophyAssetIdForAward,
} from "@/lib/awardAssets";

describe("award asset identity and fallback", () => {
  it("creates stable medal and trophy identities", () => {
    expect(medalAssetId(1)).toBe("medal:podium:gold");
    expect(medalAssetId(2)).toBe("medal:podium:silver");
    expect(medalAssetId(3)).toBe("medal:podium:bronze");
    expect(trophyAssetId({
      competitionKey: "season",
      year: 2026,
      tier: "gold",
    })).toBe("trophy:season:2026:gold");
  });

  it("resolves every supported medal, badge and generated trophy identity", () => {
    expect(([1, 2, 3] as const).map((rank) => awardAssetType(medalAssetId(rank))))
      .toEqual(["medal", "medal", "medal"]);
    expect(awardAssetType(badgeAssetId("first-sub3"))).toBe("badge");
    for (const trophy of TROPHY_ASSET_DEFINITIONS) {
      expect(awardAssetType(trophyAssetId(trophy)), trophyAssetId(trophy)).toBe("trophy");
    }
  });

  it("defines regular and historical trophy slots without awarded trophy data", () => {
    expect(TROPHY_ASSET_DEFINITIONS.map(trophyAssetId)).toEqual([
      "trophy:season:2026:gold",
      "trophy:season:2026:silver",
      "trophy:season:2026:bronze",
      "trophy:denmark:2026:gold",
      "trophy:denmark:2026:silver",
      "trophy:denmark:2026:bronze",
      "trophy:historical:first-sub-3",
      "trophy:historical:first-sub-2",
      "trophy:historical:first-bingo-card",
    ]);
  });

  it("maps historical awards to their custom asset slots", () => {
    expect(trophyAssetIdForAward({ key: "historical:first-sub-3",
      competitionType: "historical", year: 2024, tier: "gold" }))
      .toBe("trophy:historical:first-sub-3");
  });

  it("maps season awards to their slot and keeps unsupported event trophies generic", () => {
    expect(trophyAssetIdForAward({ competitionType: "season", year: 2026, tier: "silver" }))
      .toBe("trophy:season:2026:silver");
    expect(trophyAssetIdForAward({ competitionType: "event", year: 2026, tier: "gold" }))
      .toBeNull();
  });

  it("keeps normal and special badge variants distinct", () => {
    const groups = groupBadgeDefinitions([
      { badgeKey: "wins-bronze", familyKey: "wins", name: "Siege Bronze", tier: "bronze", designVariant: "standard", sortOrder: 1 },
      { badgeKey: "wins-gold", familyKey: "wins", name: "Siege Gold", tier: "gold", designVariant: "standard", sortOrder: 2 },
      { badgeKey: "world-record", familyKey: null, name: "Weltrekord", tier: "special", designVariant: "positive_special", sortOrder: 3 },
    ]);
    expect(groups[0].variants.map(({ tier }) => tier)).toEqual(["bronze", "gold"]);
    expect(groups[1].variants[0].tier).toBe("special");
    expect(badgeAssetId(groups[1].variants[0].badgeKey)).toBe("badge:world-record");
  });

  it("returns a custom URL only when the exact variant has a mapping", () => {
    expect(resolveAwardAsset({ "badge:wins-gold": "https://example.test/gold.webp" }, "badge:wins-gold"))
      .toBe("https://example.test/gold.webp");
    expect(resolveAwardAsset({ "badge:wins-gold": "https://example.test/gold.webp" }, "badge:wins-silver"))
      .toBeNull();
  });
});
