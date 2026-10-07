import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const state = vi.hoisted(() => ({ season: "all-time" as string | number,
  payloadSeason: "all-time" as string | number, status: "ready", error: null as string | null }));
vi.mock("@/hooks/useSeason", () => ({ useSeason: () => ({ season: state.season, isAllTime: state.season === "all-time" }) }));
vi.mock("@/hooks/useDataPlatform", () => ({ useDataGroup: () => ({ status: state.status, error: state.error, refresh: vi.fn() }) }));
vi.mock("@/hooks/useEffectivePublicData", () => ({ useEffectivePublicData: () => ({ data: {
  badgeRarity: [], badgeStatistics: { season: state.payloadSeason, dashboard: {
    metrics: [{ key: "bingo-fields", group: "bingo" }, { key: "badge-gold", group: "achievements" }],
  } },
} }) }));
vi.mock("@/hooks/useManagementMode", () => ({ useManagementMode: () => ({ unlocked: false }) }));
vi.mock("@/components/common/DataState", () => ({ DataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/common/OptionalDataState", () => ({ OptionalDataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/stats/StatsNavigation", () => ({ StatsNavigation: () => null }));
vi.mock("@/components/stats/AdminBadgeCatalogSlot", () => ({ AdminBadgeCatalogSlot: () => null }));
vi.mock("@/components/stats/BadgeRarityGrid", () => ({ BadgeRarityGrid: () => <div>Rarity grid</div> }));
vi.mock("@/components/stats/MetricRankingCard", () => ({ MetricDashboardGrid: ({ metrics }: { metrics: { key: string }[] }) =>
  <div>{metrics.map(metric => <span key={metric.key}>{metric.key}</span>)}</div> }));
import { StatsBadgesPage } from "./StatsBadgesPage";
beforeEach(() => { state.season = "all-time"; state.payloadSeason = "all-time"; state.status = "ready"; state.error = null; });
describe("isolated Badges UI", () => {
  it("keeps rarity while rankings move to Performance", () => {
    const html = renderToStaticMarkup(<StatsBadgesPage />);
    expect(html).not.toContain("bingo-fields");
    expect(html).not.toContain("badge-gold");
    expect(html).toContain("Rarity grid");
    expect(html).not.toContain("Most Wanted · 00");
  });
  it("hides obsolete scope data and preserves rarity on an independent ranking error", () => {
    state.season = 2026;
    expect(renderToStaticMarkup(<StatsBadgesPage />)).not.toContain("bingo-fields");
    state.status = "error"; state.error = "timeout";
    const html = renderToStaticMarkup(<StatsBadgesPage />);
    expect(html).not.toContain("Achievement-Rankings");
    expect(html).toContain("Rarity grid");
    expect(html).not.toContain("badge-gold");
  });
});
