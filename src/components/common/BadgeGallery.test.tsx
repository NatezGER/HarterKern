import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BadgeGallery } from "@/components/common/BadgeGallery";
import { badgeGalleryToggleLabel } from "@/components/common/badgeGalleryState";
import type { CompactBadge } from "@/types/historyProfiles";

const badges = Array.from({ length: 5 }, (_, index) => ({
  key: `badge-${index}`,
  badgeKey: `badge-${index}`,
  name: `Badge ${index}`,
  requirement: "Test",
  tier: "bronze",
  category: "attempts",
  threshold: index + 1,
  designVariant: "standard",
  badgeKind: "tiered",
  isSpecialEventBadge: false,
  playerId: "player-1",
  playerName: "Paul",
  playerAvatarUrl: null,
  awardedAt: "2026-01-01T00:00:00Z",
  sourceAttemptNumber: null,
  sourceTimeHundredths: null,
  rarityPercent: null,
  eventId: null,
  eventName: null,
})) as CompactBadge[];

describe("BadgeGallery responsive collapse", () => {
  it("shows two mobile cards and one desktop row while collapsed", () => {
    const markup = renderToStaticMarkup(<BadgeGallery badges={badges} mobileLimit={2} desktopLimit={3} />);
    expect(markup).toContain("sm:p-5 hidden sm:block");
    expect(markup).toContain("sm:p-5 hidden border");
  });

  it("labels positive specials as Smaragd and consolation badges as Holz", () => {
    const specialBadges = [{
      ...badges[0], tier: "special", badgeKind: "single",
      designVariant: "positive_special", name: "Positiv",
    }, {
      ...badges[1], tier: "special", badgeKind: "single",
      designVariant: "consolation", name: "Negativ",
    }] as CompactBadge[];
    const markup = renderToStaticMarkup(<BadgeGallery badges={specialBadges} />);
    expect(markup).toContain("Smaragd");
    expect(markup).toContain("Holz");
    expect(markup).not.toContain("Platinum");
  });

  it("renders every card without collapse classes when expanded", () => {
    const markup = renderToStaticMarkup(<BadgeGallery badges={badges} mobileLimit={2} desktopLimit={3} expanded />);
    expect(markup).not.toContain("sm:p-5 hidden sm:block");
    expect(markup).not.toContain("sm:p-5 hidden border");
  });

  it("uses clear labels for expanding and collapsing the gallery", () => {
    expect(badgeGalleryToggleLabel(false)).toBe("Alle Badges anzeigen");
    expect(badgeGalleryToggleLabel(true)).toBe("Weniger anzeigen");
  });
});
