import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BadgeTooltip } from "@/components/common/BadgeTooltip";
import type { CompactBadge } from "@/types/historyProfiles";

const badge = {
  key: "fast-gold", badgeKey: "fast-gold", name: "Rakete", tier: "gold",
  requirement: "Eine offizielle Zeit unter 3 Sekunden", awardedAt: "2026-05-04T12:00:00Z",
  rarityPercent: 22.2, isSpecialEventBadge: false,
} as CompactBadge;

describe("BadgeTooltip", () => {
  it("shows only requirement and rarity in the visible tooltip detail", () => {
    const markup = renderToStaticMarkup(<BadgeTooltip badge={badge} />);
    const tooltip = markup.match(/<span[^>]*role="tooltip"[^>]*>(.*?)<\/span>/)?.[1] ?? "";
    expect(tooltip).toContain("Eine offizielle Zeit unter 3 Sekunden.");
    expect(tooltip).toContain("Seltenheit: 22,2 % der Spieler");
    expect(tooltip).not.toContain("Freischaltbedingung");
    expect(tooltip).not.toContain("Freigeschaltet am");
    expect(tooltip).not.toContain("Rakete");
    expect(tooltip).not.toContain("Gold");
  });

  it("keeps button semantics and keyboard/mobile disclosure attributes", () => {
    const markup = renderToStaticMarkup(<BadgeTooltip badge={badge} />);
    expect(markup).toContain("<button");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("aria-describedby");
    expect(markup).toContain('role="tooltip"');
  });
});
