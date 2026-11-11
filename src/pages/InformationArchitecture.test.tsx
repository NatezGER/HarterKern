import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const seasonState = vi.hoisted(() => ({ isAllTime: false }));
const leaderboardState = vi.hoisted(() => ({ mode: "best" as "best" | "average" | "medals" }));
const useMedals = vi.hoisted(() => vi.fn<typeof import("@/hooks/useHallOfFameMedals").useHallOfFameMedals>());

vi.mock("@/hooks/useHallOfFameMedals", () => ({ useHallOfFameMedals: useMedals }));

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({ entries: [], mode: leaderboardState.mode, setMode: vi.fn() }),
}));
vi.mock("@/hooks/useSeason", () => ({ useSeason: () => ({ season: seasonState.isAllTime ? "all-time" : 2026, isAllTime: seasonState.isAllTime }) }));
vi.mock("@/components/common/DataState", () => ({ DataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/leaderboard/Podium", () => ({ Podium: () => <div>Podium</div> }));
vi.mock("@/components/leaderboard/LeaderboardList", () => ({
  LeaderboardList: ({ emptyLabel }: { emptyLabel: string }) => <div>{emptyLabel}</div>,
}));
vi.mock("@/components/management/ManagementPanel", () => ({ ManagementPanel: () => <div>Verwaltungsmodus</div> }));

import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { SettingsPage } from "@/pages/SettingsPage";

describe("information architecture pages", () => {
  beforeEach(() => {
    seasonState.isAllTime = false;
    leaderboardState.mode = "best";
    useMedals.mockReset().mockReturnValue({
      result: { scope: 2026, status: "loading", pending: [], rows: [], notes: [], evaluatedCategories: 0 },
      retry: vi.fn(),
    });
  });
  it("shows the leaderboard directly without search or filter controls", () => {
    seasonState.isAllTime = false;
    const markup = renderToStaticMarkup(<LeaderboardPage />);
    expect(markup).toContain("Saisonrangliste 2026");
    expect(markup).toMatch(/aria-pressed="true"[^>]*>Bestzeit<\/button>/);
    expect(markup).toMatch(/aria-pressed="false"[^>]*>Durchschnitt<\/button>/);
    expect(markup).toContain("Noch keine qualifizierten Zeiten in Saison 2026.");
    expect(markup).toMatch(/aria-pressed="false"[^>]*>Medaillenspiegel<\/button>/);
    expect(useMedals).toHaveBeenCalledExactlyOnceWith(false);
    expect(markup).not.toContain("Spieler suchen");
    expect(markup).not.toContain("Filter vorbereiten");
    expect(markup).not.toContain("Kein Spieler gefunden.");
    expect(markup).not.toContain("Secret Hall of Fame");
    expect(markup).not.toContain("Alle Einzelversuche");
  });

  it("keeps average available without enabling medal reads", () => {
    leaderboardState.mode = "average";
    const markup = renderToStaticMarkup(<LeaderboardPage />);
    expect(markup).toContain("Saison-Durchschnitt 2026");
    expect(markup).toMatch(/aria-pressed="true"[^>]*>Durchschnitt<\/button>/);
    expect(markup).toMatch(/aria-pressed="false"[^>]*>Medaillenspiegel<\/button>/);
    expect(markup).not.toContain("Secret Hall of Fame");
    expect(useMedals).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("shows advanced Hall of Fame only in All-Time mode", () => {
    seasonState.isAllTime = true;
    const markup = renderToStaticMarkup(<LeaderboardPage />);
    expect(markup).toContain("Secret Hall of Fame");
    expect(markup).toContain("Alle Einzelversuche");
    expect(useMedals).toHaveBeenCalledExactlyOnceWith(false);
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
