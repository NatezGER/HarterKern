import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TrophyCabinet } from "@/components/common/TrophyCabinet";
import type { TrophyAward } from "@/types/historyProfiles";

vi.mock("react-router-dom", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => <a href={to} className={className}>{children}</a>,
}));

const trophy = (placement: 1 | 2 | 3): TrophyAward => ({
  key: `trophy-${placement}`,
  competitionType: "event",
  scopeType: "event",
  competitionId: "event-1",
  seasonKey: null,
  competitionName: "Finale",
  year: 2026,
  eventDate: "2026-07-31",
  placement,
  tier: placement === 1 ? "gold" : placement === 2 ? "silver" : "bronze",
  playerId: "player-1",
  guestId: null,
  playerName: "Paul",
  awardedAt: "2026-07-31T20:00:00Z",
});

describe("TrophyCabinet", () => {
  it("separates trophies from badges and collapses after two mobile entries", () => {
    const markup = renderToStaticMarkup(<TrophyCabinet trophies={[trophy(1), trophy(2), trophy(3)]} />);
    expect(markup).toContain("1. Platz");
    expect(markup).toContain("2. Platz");
    expect(markup).toContain("3. Platz");
    expect(markup).toContain("max-sm:hidden");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Alle Trophäen anzeigen");
  });
});
