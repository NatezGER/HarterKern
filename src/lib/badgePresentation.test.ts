import { describe, expect, it } from "vitest";
import { badgeTierLabel, compareBadgeDisplayOrder, formatBadgeTime, getAwardBadgeDisplayName, getBadgeCenterMark, getBadgeMaterialLabel } from "@/lib/badgePresentation";

describe("badge presentation", () => {
  it("uses Smaragd and Holz for special badge variants", () => {
    expect(badgeTierLabel.special).toBe("Smaragd");
    expect(getBadgeMaterialLabel({ tier: "special", designVariant: "positive_special" })).toBe("Smaragd");
    expect(getBadgeMaterialLabel({ tier: "special", designVariant: "consolation" })).toBe("Holz");
    expect(badgeTierLabel.diamond).toBe("Diamond");
  });

  it("orders materials as Smaragd, Diamond, Gold, Silber, Bronze, Holz", () => {
    const badges = [
      { tier: "gold", designVariant: "standard" },
      { tier: "special", designVariant: "consolation" },
      { tier: "bronze", designVariant: "standard" },
      { tier: "diamond", designVariant: "standard" },
      { tier: "silver", designVariant: "standard" },
      { tier: "special", designVariant: "positive_special" },
    ] as const;
    expect([...badges].sort(compareBadgeDisplayOrder).map(getBadgeMaterialLabel)).toEqual([
      "Smaragd", "Diamond", "Gold", "Silber", "Bronze", "Holz",
    ]);
  });

  it("creates compact family-specific center marks", () => {
    expect(getBadgeCenterMark({ badgeKey: "official-world-record" })).toBe("WR");
    expect(getBadgeCenterMark({ badgeKey: "first-sub3", threshold: 300 })).toBe("<3s");
    expect(getBadgeCenterMark({ badgeKey: "event-wins-gold", category: "wins", threshold: 10 })).toBe("10×");
    expect(getBadgeCenterMark({ badgeKey: "important-event-gold" })).toBe("#1");
  });

  it("adds the personal Favorite Time only to an awarded display name", () => {
    expect(formatBadgeTime(294)).toBe("2,94 s");
    expect(getAwardBadgeDisplayName("Déjà-vu", "favorite_time", 294)).toBe("Déjà-vu · 2,94 s");
    expect(getAwardBadgeDisplayName("Déjà-vu", "favorite_time", null)).toBe("Déjà-vu");
  });

  it("renders dynamic and special badge marks without long labels", () => {
    expect(getBadgeCenterMark({ badgeKey: "time-stopper", valueHundredths: 300 })).toBe("3,00");
    expect(getBadgeCenterMark({ badgeKey: "almost", valueHundredths: 301 })).toBe("3,01");
    expect(getBadgeCenterMark({ badgeKey: "matrix-glitch" })).toBe("==");
    expect(getBadgeCenterMark({ badgeKey: "false-starter" })).toBe("DNF");
    expect(getBadgeCenterMark({ badgeKey: "photo-finish" })).toBe("+.01");
    expect(getBadgeCenterMark({ badgeKey: "reverse-gear" })).toBe("⇣5");
    expect(getBadgeCenterMark({ badgeKey: "wooden-bronze-medal" })).toBe("#4×5");
    expect(getBadgeCenterMark({ badgeKey: "bingo-completion-diamond", category: "bingo" })).toBe("100");
    expect(getBadgeCenterMark({ badgeKey: "bingo-gold", category: "bingo" })).toBe("BI");
  });
});
