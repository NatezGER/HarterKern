import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));
import {
  BadgeRarityContent,
} from "@/components/stats/BadgeRarityGrid";
import { nextBadgeRaritySelection } from "@/lib/badgeRaritySelection";
import type { BadgeRarity } from "@/types";

const badges: BadgeRarity[] = [{
  key: "fast-bronze",
  name: "Blitzstarter",
  tier: "bronze",
  designVariant: "standard",
  recipients: 1,
  playerCount: 4,
  percent: 25,
  recipientsList: [{
    playerId: "player-1",
    playerName: "Paul",
    avatarUrl: "https://example.com/paul.webp",
  }],
}, {
  key: "empty-gold",
  name: "Unberührt",
  tier: "gold",
  designVariant: "standard",
  recipients: 0,
  playerCount: 4,
  percent: 0,
  recipientsList: [],
}];

function render(selectedKey: string | null) {
  return renderToStaticMarkup(<BadgeRarityContent
    badges={badges}
    selectedKey={selectedKey}
    onSelect={vi.fn()}
  />);
}

describe("BadgeRarityGrid", () => {
  it("uses a two-column mobile grid with accessible disclosure buttons", () => {
    const markup = render(null);
    expect(markup).toContain("grid-cols-2");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("col-span-2");
  });

  it("shows recipient name, avatar and profile link for the selected badge", () => {
    const markup = render("fast-bronze");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Paul");
    expect(markup).toContain("Profilbild von Paul");
    expect(markup).toContain('href="/player/player-1"');
    expect(markup).toContain("25 %");
  });

  it("shows a clean empty state", () => {
    expect(render("empty-gold")).toContain("Noch kein dauerhafter Spieler besitzt dieses Badge.");
  });

  it("closes the same badge and switches directly to another badge", () => {
    expect(nextBadgeRaritySelection("fast-bronze", "fast-bronze")).toBeNull();
    expect(nextBadgeRaritySelection("fast-bronze", "empty-gold")).toBe("empty-gold");
  });
});
