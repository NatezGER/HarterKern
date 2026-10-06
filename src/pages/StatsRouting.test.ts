import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getRouteDataPlan } from "@/services/dataGroupService";

const routes = readFileSync("src/App.tsx", "utf8");
const overview = readFileSync("src/pages/StatsOverviewPage.tsx", "utf8");

describe("statistics routes", () => {
  it("registers every stats subpage as a directly reachable route", () => {
    expect(routes).toContain('{ path: "stats", element: <StatsOverviewPage /> }');
    expect(routes).toContain('{ path: "stats/performance", element: <StatsPage /> }');
    expect(routes).toContain('{ path: "stats/most-wanted", element: <StatsMostWantedPage /> }');
    expect(routes).toContain('{ path: "stats/rivalries", element: <StatsRivalriesPage /> }');
    expect(routes).toContain('{ path: "stats/badges", element: <StatsBadgesPage /> }');
  });

  it("keeps the overview free of full dashboard, Most Wanted and badge rarity reads", () => {
    expect(getRouteDataPlan("/stats")).toEqual({ required: ["statistics"], optional: [] });
    expect(overview).not.toContain("useStatisticDashboard");
    expect(overview).not.toContain("MostWantedMatrix");
    expect(overview).not.toContain("BadgeRarityGrid");
  });
});
