import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useSeason", () => ({ useSeason: () => ({ season: "all-time", isAllTime: true }) }));
vi.mock("@/hooks/useEffectivePublicData", () => ({ useEffectivePublicData: () => ({ data: {
  statistics: [
    { id: "fastest", label: "Schnellste Zeit", value: "2,99 s", change: "Weltrekord", icon: "timer" },
    { id: "valid", label: "Gültige Eventversuche", value: "10", change: "Offiziell", icon: "timer" },
    { id: "players", label: "Reguläre Spieler", value: "3", change: "Aktiv", icon: "users" },
    { id: "events", label: "Events", value: "2", change: "Abende", icon: "trophy" },
  ], eventLeadStatistics: [], mostWanted: {},
  leagueTimeStatistics: {}, badgeRarity: [],
} }) }));
vi.mock("@/hooks/useDataPlatform", () => ({
  useDataPlatform: () => ({ snapshot: { liveState: { historicalAttempts: [] } } }),
  useDataGroup: () => ({ version: 1 }),
}));
vi.mock("@/hooks/useStatisticDashboard", () => ({ useStatisticDashboard: () => ({ data: {
  metrics: [{
    key: "fastest", title: "Schnellste Zeit", description: "Bestzeiten",
    format: "time", direction: "asc", minimumSample: 1, group: "performance",
    overallValue: 299, overallCount: null, overallTotal: null,
    overallDetail: null, rankings: [],
  }], rivalryPairs: [],
}, loading: false, error: "" }) }));
vi.mock("@/hooks/useManagementMode", () => ({ useManagementMode: () => ({ unlocked: false }) }));
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

import { StatsPage } from "@/pages/StatsPage";

describe("StatsPage structure", () => {
  it("moves the six base cards into the shared block and removes league milestones", () => {
    const markup = renderToStaticMarkup(<StatsPage />);
    expect(markup.indexOf("Record Progression")).toBeLessThan(markup.indexOf("Most Wanted Matrix"));
    expect(markup).toContain("Versuchnummern-Chart");
    expect(markup.indexOf("Versuchnummern-Chart")).toBeLessThan(markup.indexOf("Ligastatistiken"));
    expect(markup.indexOf("Record Progression")).toBeLessThan(markup.indexOf("Schnellste Zeit"));
    expect(markup).toContain("Reguläre Spieler");
    expect(markup).not.toContain("Gültige Eventversuche");
    expect(markup).not.toContain("Liga-Meilensteine");
    expect(markup).toContain("data-metric-dashboard");
    expect(markup).toContain("Badge-Seltenheit");
    expect(markup).not.toContain("Vergangene Events");
    expect(markup).not.toContain("Eventarchiv");
  });
});
