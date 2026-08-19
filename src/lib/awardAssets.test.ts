import { describe, expect, it } from "vitest";
import {
  badgeAssetId,
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

  it("defines all six trophy slots without awarded trophy data", () => {
    expect(TROPHY_ASSET_DEFINITIONS.map(trophyAssetId)).toEqual([
      "trophy:season:2026:gold",
      "trophy:season:2026:silver",
      "trophy:season:2026:bronze",
      "trophy:denmark:2026:gold",
      "trophy:denmark:2026:silver",
      "trophy:denmark:2026:bronze",
    ]);
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
