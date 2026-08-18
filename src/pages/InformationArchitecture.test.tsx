import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useLeaderboard", () => ({ useLeaderboard: () => ({ entries: [] }) }));
vi.mock("@/hooks/useSeason", () => ({ useSeason: () => ({ season: 2026, isAllTime: false }) }));
vi.mock("@/components/common/DataState", () => ({ DataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/leaderboard/Podium", () => ({ Podium: () => <div>Podium</div> }));
vi.mock("@/components/leaderboard/LeaderboardList", () => ({
  LeaderboardList: ({ emptyLabel }: { emptyLabel: string }) => <div>{emptyLabel}</div>,
}));
vi.mock("@/components/management/ManagementPanel", () => ({ ManagementPanel: () => <div>Verwaltungsmodus</div> }));

import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { SettingsPage } from "@/pages/SettingsPage";

describe("information architecture pages", () => {
  it("shows the leaderboard directly without search or filter controls", () => {
    const markup = renderToStaticMarkup(<LeaderboardPage />);
    expect(markup).toContain("Saisonrangliste 2026");
    expect(markup).toContain("Noch keine qualifizierten Zeiten in Saison 2026.");
    expect(markup).not.toContain("Spieler suchen");
    expect(markup).not.toContain("Filter vorbereiten");
    expect(markup).not.toContain("Kein Spieler gefunden.");
  });

  it("keeps Settings focused on real administration", () => {
    const markup = renderToStaticMarkup(<SettingsPage />);
    expect(markup).toContain("Geschützte Verwaltung für Versuche, Events, Spieler und Auszeichnungen.");
    expect(markup).not.toContain("Darstellung");
    expect(markup).not.toContain("Benachrichtigungen");
    expect(markup).not.toContain("Daten &amp; Privatsphäre");
    expect(markup).not.toContain("Optimierte Ansichten");
  });
});
