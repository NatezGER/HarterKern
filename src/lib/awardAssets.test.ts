import { describe, expect, it } from "vitest";
import {
  badgeAssetId,
  groupBadgeDefinitions,
  medalAssetId,
  resolveAwardAsset,
  trophyAssetId,
} from "@/lib/awardAssets";

describe("award asset identity and fallback", () => {
  it("creates stable medal and trophy identities", () => {
    expect(medalAssetId(1)).toBe("medal:podium:gold");
    expect(medalAssetId(2)).toBe("medal:podium:silver");
    expect(medalAssetId(3)).toBe("medal:podium:bronze");
    expect(trophyAssetId({
      competitionType: "season",
      competitionId: "season-2026",
      year: 2026,
      tier: "gold",
    })).toBe("trophy:season:season-2026:2026:gold");
  });

  it("keeps normal and special badge variants distinct", () => {
    const groups = groupBadgeDefinitions([
      { badgeKey: "wins-bronze", familyKey: "wins", name: "Siege Bronze", tier: "bronze", sortOrder: 1 },
      { badgeKey: "wins-gold", familyKey: "wins", name: "Siege Gold", tier: "gold", sortOrder: 2 },
      { badgeKey: "world-record", familyKey: null, name: "Weltrekord", tier: "special", sortOrder: 3 },
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
