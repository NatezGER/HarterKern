import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ dashboardError: false, season: "all-time" as string | number }));

vi.mock("@/hooks/useSeason", () => ({ useSeason: () => ({ season: state.season, isAllTime: state.season === "all-time" }) }));
vi.mock("@/hooks/useEffectivePublicData", () => ({ useEffectivePublicData: () => ({ data: {
  statistics: [
    { id: "fastest", label: "Schnellste Zeit", value: "2,99 s", change: "Weltrekord", icon: "timer" },
    { id: "valid", label: "Gültige Eventversuche", value: "10", change: "Offiziell", icon: "timer" },
    { id: "players", label: "Reguläre Spieler", value: "3", change: "Aktiv", icon: "users" },
    { id: "events", label: "Events", value: "2", change: "Abende", icon: "trophy" },
  ], eventLeadStatistics: [], mostWanted: {},
  leagueTimeStatistics: {}, badgeRarity: [],
  teamMilestones: { season: state.season, validAttempts: 10, teamTimeHundredths: 2784, playerCount: 10 },
  badgeStatistics: { season: state.season, dashboard: { metrics: [{ key: "bingo-fields", title: "BINGO-Ranking", group: "bingo", rankings: [], overallValue: null }] } },
} }) }));
vi.mock("@/hooks/useDataPlatform", () => ({
  useDataPlatform: () => ({ snapshot: { liveState: { historicalAttempts: [] } } }),
  useDataGroup: () => ({ version: 1 }),
}));
vi.mock("@/hooks/usePerformanceDashboard", () => ({ usePerformanceDashboard: () => ({ data: state.dashboardError ? null : {
  season: state.season, players: [], attemptNumbers: [],
  statistics: [{ id: "players", label: "Reguläre Spieler", value: "3", change: "Aktiv", icon: "users" }],
  dashboard: {
  metrics: [{
    key: "fastest", title: "Schnellste Zeit", description: "Bestzeiten",
    format: "time", direction: "asc", minimumSample: 1, group: "performance",
    overallValue: 299, overallCount: null, overallTotal: null,
    overallDetail: null, rankings: [],
  }], rivalryPairs: [],
}}, loading: false, error: state.dashboardError ? "timeout" : "", retry: vi.fn() }) }));
vi.mock("@/hooks/useManagementMode", () => ({ useManagementMode: () => ({ unlocked: false }) }));
vi.mock("@/hooks/useRivalryHub", () => ({ useRivalryHub: () => ({ data: null, loading: false, error: null }) }));
vi.mock("@/components/common/DataState", () => ({ DataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/common/OptionalDataState", () => ({ OptionalDataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/dashboard/WRProgression", () => ({ WRProgression: () => <div>Record Progression</div> }));
vi.mock("@/components/stats/MostWantedMatrix", () => ({ MostWantedMatrix: () => <div>Most Wanted Matrix</div> }));
vi.mock("@/components/stats/GroupMilestones", () => ({ GroupMilestones: () => <div>Liga-Meilensteine Inhalt</div> }));
vi.mock("@/components/stats/LeagueTimeStatistics", () => ({ LeagueTimeStatistics: () => <div>Ligastatistiken Inhalt</div> }));
vi.mock("@/components/stats/EventLeadStatistics", () => ({ EventLeadStatistics: () => <div>Führungswerte kompakt</div> }));
vi.mock("@/components/stats/OfficialTimePerformance", () => ({
  OfficialTimeThresholds: () => <div>Zeitquoten</div>,
  LeagueAttemptNumberChart: () => <div>Versuchnummern-Chart</div>,
}));
vi.mock("@/components/history/HistoricalAttemptsDisclosure", () => ({ HistoricalAttemptsDisclosure: () => <div>History collapsed</div> }));
vi.mock("@/components/players/AttemptNumberChart", () => ({ AttemptNumberChart: () => <div>Versuchnummern-Chart</div> }));
vi.mock("@/components/stats/StatsNavigation", () => ({ StatsNavigation: () => <nav>Stats Subnavigation</nav> }));

import { StatsPage } from "@/pages/StatsPage";
import { StatsMostWantedPage } from "@/pages/StatsMostWantedPage";
import { StatsOverviewPage } from "@/pages/StatsOverviewPage";
import { MemoryRouter } from "react-router-dom";

describe("StatsPage structure", () => {
  it("keeps WR progression prominent and attempt-number analysis only on Performance", () => {
    state.season = "all-time";
    const overview = renderToStaticMarkup(<MemoryRouter><StatsOverviewPage /></MemoryRouter>);
    expect(overview.indexOf("Record Progression")).toBeLessThan(overview.indexOf("Liga-Überblick"));
    expect(overview).not.toContain("Versuchnummern-Chart");
    expect(overview).toContain("2,0 L");
    const milestones = renderToStaticMarkup(<StatsMostWantedPage />);
    expect(milestones).toContain("2,0 L");
    expect(milestones).toContain("Top-10-Teamzeit");
  });
  it("keeps only performance-related statistics on the performance page", () => {
    state.dashboardError = false;
    state.season = "all-time";
    const markup = renderToStaticMarkup(<StatsPage />);
    expect(markup).not.toContain("Most Wanted Matrix");
    expect(markup).toContain("Versuchnummern-Chart");
    expect(markup.indexOf("Versuchnummern-Chart")).toBeLessThan(markup.indexOf("Ligastatistiken"));
    expect(markup.indexOf("Record Progression")).toBeLessThan(markup.indexOf("Schnellste Zeit"));
    expect(markup).toContain("Reguläre Spieler");
    expect(markup).not.toContain("Gültige Eventversuche");
    expect(markup).not.toContain("Liga-Meilensteine");
    expect(markup).toContain("data-metric-dashboard");
    expect(markup).not.toContain("Badge-Seltenheit");
    expect(markup).not.toContain("Rivalry-Paarstatistiken");
    expect(markup).toContain("Stats Subnavigation");
    expect(markup).not.toContain("Vergangene Events");
    expect(markup).not.toContain("Eventarchiv");
    expect(markup).toContain("text-xl");
  });

  it("offers a focused dashboard retry after an error", () => {
    state.dashboardError = true;
    const markup = renderToStaticMarkup(<StatsPage />);
    expect(markup).toContain("Ranking-Statistiken konnten nicht geladen werden.");
    expect(markup).toContain("Bereich neu laden");
    expect(markup).toContain("Record Progression");
    expect(markup).toContain("History collapsed");
  });
  it("preserves the season scope without loading/rendering the All-Time archive", () => {
    state.dashboardError = false;
    state.season = 2026;
    const markup = renderToStaticMarkup(<StatsPage />);
    expect(markup).toContain("Saison 2026");
    expect(markup).toContain("Versuchnummern-Chart");
    expect(markup).toContain("BINGO-Ranking");
    expect(markup).not.toContain("History collapsed");
    expect(markup).not.toContain("Most Wanted Matrix");
    state.season = "all-time";
  });
  it("renders the unchanged matrix on the new Most Wanted page", () => {
    const markup = renderToStaticMarkup(<StatsMostWantedPage />);
    expect(markup).toContain("Most Wanted Matrix");
    expect(markup).toContain("Meilensteine");
    expect(markup).toContain("Top-10-Teamzeit");
    expect(markup).toContain("Stats Subnavigation");
    expect(markup).not.toContain("Record Progression");
  });
});
