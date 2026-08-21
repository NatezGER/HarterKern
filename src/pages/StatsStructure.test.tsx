import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useSeason", () => ({ useSeason: () => ({ season: "all-time", isAllTime: true }) }));
vi.mock("@/hooks/useEffectivePublicData", () => ({ useEffectivePublicData: () => ({ data: {
  statistics: [], eventLeadStatistics: [], mostWanted: {},
  leagueTimeStatistics: {}, badgeRarity: [],
} }) }));
vi.mock("@/hooks/useDataPlatform", () => ({ useDataPlatform: () => ({ snapshot: { liveState: { historicalAttempts: [] } } }) }));
vi.mock("@/components/common/DataState", () => ({ DataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/common/OptionalDataState", () => ({ OptionalDataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/dashboard/WRProgression", () => ({ WRProgression: () => <div>Record Progression</div> }));
vi.mock("@/components/stats/MostWantedMatrix", () => ({ MostWantedMatrix: () => <div>Most Wanted Matrix</div> }));
vi.mock("@/components/stats/GroupMilestones", () => ({ GroupMilestones: () => <div>Liga-Meilensteine Inhalt</div> }));
vi.mock("@/components/stats/LeagueTimeStatistics", () => ({ LeagueTimeStatistics: () => <div>Ligastatistiken Inhalt</div> }));
vi.mock("@/components/stats/OfficialTimePerformance", () => ({
  OfficialTimeThresholds: () => <div>Zeitquoten</div>,
  LeagueAttemptNumberChart: () => <div>Versuchnummern-Chart</div>,
}));
vi.mock("@/components/history/HistoricalAttemptsDisclosure", () => ({ HistoricalAttemptsDisclosure: () => <div>History collapsed</div> }));

import { StatsPage } from "@/pages/StatsPage";

describe("StatsPage structure", () => {
  it("puts Most Wanted before milestones and keeps events out of statistics", () => {
    const markup = renderToStaticMarkup(<StatsPage />);
    expect(markup.indexOf("Most Wanted Matrix")).toBeLessThan(markup.indexOf("Liga-Meilensteine Inhalt"));
    expect(markup).toContain("Versuchnummern-Chart");
    expect(markup).toContain("Badge-Seltenheit");
    expect(markup).toContain("grid grid-cols-2 gap-3");
    expect(markup).not.toContain("col-span-2");
    expect(markup).not.toContain("Vergangene Events");
    expect(markup).not.toContain("Eventarchiv");
  });
});
