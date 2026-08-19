import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/hooks/useSeason", () => ({
  useSeason: () => ({ season: 2026, isAllTime: false }),
}));
vi.mock("@/hooks/useEffectivePublicData", () => ({
  useEffectivePublicData: () => ({
    data: { players: [], leaderboard: [], worldRecordHistory: [] },
  }),
}));

import { HallOfFamePreview } from "@/components/dashboard/HallOfFamePreview";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { WRProgression } from "@/components/dashboard/WRProgression";

describe("season dashboard polish", () => {
  it("keeps the compact brand hierarchy without marketing copy", () => {
    const markup = renderToStaticMarkup(<HeroCard />);
    expect(markup).toContain("Harter Kern");
    expect(markup).toContain("2 Fast 2 Drink");
    expect(markup).toContain("Saison 2026");
    expect(markup).not.toContain("THE ORIGINAL SPEED DRINKING LEAGUE");
    expect(markup).not.toContain("Wo Sekunden zu Legenden werden.");
    expect(markup).not.toContain("min-h-[430px]");
    expect(markup).toContain("context-hero-glow");
    expect(markup).toContain("context-gradient-text");
  });

  it("labels season record progression and its empty state", () => {
    const markup = renderToStaticMarkup(<WRProgression />);
    expect(markup).toContain("Saisonrekord-Progression");
    expect(markup).toContain("Noch kein Saisonrekord 2026.");
    expect(markup).not.toContain("Noch kein offizieller Weltrekord.");
  });

  it("uses a season-specific Hall of Fame empty state", () => {
    const markup = renderToStaticMarkup(<HallOfFamePreview />);
    expect(markup).toContain("Saisonrangliste 2026");
    expect(markup).toContain("Noch keine qualifizierten Zeiten in Saison 2026.");
  });
});
