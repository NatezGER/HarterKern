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

  it("shows a season trophy as a career award without an event link", () => {
    const seasonTrophy: TrophyAward = {
      ...trophy(1),
      key: "season-trophy-2026",
      competitionType: "season",
      scopeType: "season",
      competitionId: "season-2026",
      seasonKey: "2026",
      competitionName: "Saisonmeister 2026",
      eventDate: "2026-12-31",
    };
    const markup = renderToStaticMarkup(
      <TrophyCabinet trophies={[trophy(1), seasonTrophy]} />,
    );
    expect(markup).toContain("Finale");
    expect(markup).toContain('href="/events/event-1"');
    expect(markup).toContain("Saisonmeister");
    expect(markup).toContain("Saison 2026");
    expect(markup).toContain("Karriere-Trophäe");
    expect(markup).toContain("1. Platz");
    expect(markup).not.toContain("/events/season-2026");
    expect(markup.match(/href=/g)).toHaveLength(1);
  });

  it("renders a historical achievement as a named trophy without an event link", () => {
    const historical: TrophyAward = {
      ...trophy(1),
      key: "historical:first-sub-3",
      competitionType: "historical",
      scopeType: "all_time",
      competitionId: "historical-sub3",
      competitionName: "Erster Sub 3",
      eventDate: "2024-01-01",
    };
    const markup = renderToStaticMarkup(<TrophyCabinet trophies={[historical]} />);
    expect(markup).toContain("Erster Sub 3");
    expect(markup).toContain("Historische Trophäe");
    expect(markup).not.toContain("1. Platz");
    expect(markup).not.toContain("href=");
  });
});
