import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import type { BeerStatistics } from "@/types/beerStatistics";
const state = vi.hoisted(() => ({ season: "all-time" as number | "all-time", data: undefined as BeerStatistics | undefined, status: "ready", error: null }));
vi.mock("@/hooks/useSeason", () => ({ useSeason: () => ({ season: state.season, isAllTime: state.season === "all-time" }) }));
vi.mock("@/hooks/useEffectivePublicData", () => ({ useEffectivePublicData: () => ({ data: { beerStatistics: state.data } }) }));
vi.mock("@/hooks/useDataPlatform", () => ({ useDataGroup: () => ({ status: state.status, error: state.error, refresh: vi.fn() }) }));
vi.mock("@/hooks/useMilestoneContent", () => ({ useMilestoneContent: () => ({ data: {}, error: "" }) }));
vi.mock("@/components/common/DataState", () => ({ DataState: ({ children }: { children: ReactNode }) => children }));
vi.mock("react-router-dom", () => ({ Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>, NavLink: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }));
import { StatsBeerPage } from "./StatsBeerPage";
import { beerEffectLabel } from "@/lib/beerStatisticsFormat";
const fixture = (): BeerStatistics => ({
  season: "all-time", summary: { attempts: 3, brands: 1, events: 1, people: 3, bestBeer: null },
  brands: [{ imagePath: null, players: [], eventDetails: [], brand: "Flensburger", attempts: 3, events: 1, people: 3, performanceAttempts: 1,
    averageHundredths: 250, bestHundredths: 250, qualified: false, performancePosition: null,
    mostDrinker: { personKey: "p", playerId: "p", name: "Paul", isGuest: false, isAk: false, attempts: 1 }, bestPlayer: null }],
  favorites: [], effects: [], variety: [], fastest: [], unlucky: [],
});
const render = () => renderToStaticMarkup(<StatsBeerPage />);
beforeEach(() => { state.data = fixture(); state.season = "all-time"; state.status = "ready"; });
it("shows record book, shelf and player sections without the old volume hero", () => {
  const html = render();
  expect(html).toContain('href="/stats/beer"');
  expect(html.indexOf("Bier-Rekordbuch")).toBeLessThan(html.indexOf("Bierregal"));
  expect(html.indexOf("Bierregal")).toBeLessThan(html.indexOf("Spieler &amp; Bier"));
  expect(html).toContain("0,6 L");
  expect(html).toContain("3 Versuche");
  expect(html).not.toContain("data-artwork-slot");
  expect(html).not.toContain("Dokumentiert getrunken");
  expect(html).toContain("<summary");
  expect(html).toContain("<details");
  expect(html).not.toContain("<details open");
});
it("shows raw single-sample brand data without giving a winner award", () => {
  const html = render();
  expect(html).toContain("2,50 s");
  expect(html).toContain("1/2 Leistungsversuche");
  expect(html).not.toContain("Bestes Bier nach qualifiziertem");
  expect(html).not.toContain("Leistungsplatz 1");
  expect(html).toContain("Noch niemand mit 2 Leistungsversuchen");
});
it("shows the empty state without zero-volume brand rankings", () => {
  state.data = { ...fixture(), summary: { attempts: 0, brands: 0, events: 0, people: 0, bestBeer: null }, brands: [] };
  expect(render()).toContain("Für diesen Zeitraum wurden noch keine Biersorten dokumentiert.");
  expect(render()).not.toContain("data-beer-statistics");
});
it("hides a stale snapshot on scope switch and renders the matching new data", () => {
  state.season = 2026;
  expect(render()).not.toContain("Flensburger");
  state.data = { ...fixture(), season: 2026, summary: { ...fixture().summary, attempts: 2 },
    brands: [{ ...fixture().brands[0], attempts: 2 }] };
  expect(render()).toContain("0,4 L");
  expect(render()).not.toContain("0,6 L");
});
it("retains independent loading, error and retry states", () => {
  state.status = "loading"; expect(render()).toContain("Bereich wird geladen.");
  state.status = "error"; expect(render()).toContain("Bereich erneut laden");
  expect(render()).not.toContain("data-beer-statistics");
});
it("formats positive, negative and rounded-neutral effects correctly", () => {
  expect(beerEffectLabel(-25)).toBe("0,25 s schneller als Gesamt-Ø");
  expect(beerEffectLabel(18)).toBe("0,18 s langsamer als Gesamt-Ø");
  expect(beerEffectLabel(0)).toContain("Gleichauf");
});
it("contains long free-text brands in wrapping, min-width-zero mobile layouts", () => {
  state.data!.brands[0].brand = "X".repeat(80);
  const html = render();
  expect(html).toContain("X".repeat(80));
  expect(html).toContain("[overflow-wrap:anywhere]");
  expect(html).toContain("min-w-0");
  expect(html).toContain("md:grid-cols-2");
  expect(html).not.toContain("<table");
});
