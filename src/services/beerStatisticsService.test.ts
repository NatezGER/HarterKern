import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc: mocks.rpc }) }));
import { getBeerStatistics, mapBeerStatistics } from "./beerStatisticsService";
import { dataGroupCache, getRouteDataPlan, loadDataGroup, invalidateDataGroups, groupsForRealtimeTable, dataGroupRequestCounts } from "./dataGroupService";
const payload = (seasonYear: number | null = null) => ({
  seasonYear, summary: { attempts: 3, brands: 1, events: 1, people: 3, bestBeer: null },
  brands: [], favorites: [], effects: [], variety: [], fastest: [], unlucky: [],
});
beforeEach(() => {
  vi.clearAllMocks(); dataGroupCache.invalidate();
  mocks.rpc.mockImplementation((_name, args) => Promise.resolve({ data: payload(args.p_season_year), error: null }));
});
it("uses exactly one RPC for each scope, without brand or player requests", async () => {
  expect((await getBeerStatistics("all-time")).season).toBe("all-time");
  expect((await getBeerStatistics(2026)).season).toBe(2026);
  expect(mocks.rpc.mock.calls).toEqual([
    ["get_beer_statistics_dashboard", { p_season_year: null }],
    ["get_beer_statistics_dashboard", { p_season_year: 2026 }],
  ]);
});
it("deduplicates reads and caches separately per season in the existing route cache", async () => {
  const results = await Promise.all([loadDataGroup("beer-statistics", 2026), loadDataGroup("beer-statistics", 2026)]);
  expect(results[0]).toEqual(results[1]);
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  await loadDataGroup("beer-statistics", "all-time");
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  invalidateDataGroups(["beer-statistics"]);
  await loadDataGroup("beer-statistics", 2026);
  expect(mocks.rpc).toHaveBeenCalledTimes(3);
});
it("isolates the tab and invalidates only on its canonical sources", () => {
  expect(getRouteDataPlan("/stats/beer")).toEqual({ required: ["navigation"], optional: ["beer-statistics"] });
  expect(dataGroupRequestCounts["beer-statistics"]).toBe(1);
  for (const source of ["attempts", "events", "players", "event_guests", "beer_brand_images"]) expect(groupsForRealtimeTable(source)).toContain("beer-statistics");
  for (const source of ["historical_attempts", "badge_definitions", "event_photos"]) expect(groupsForRealtimeTable(source)).not.toContain("beer-statistics");
  for (const route of ["/stats", "/stats/performance", "/stats/badges", "/stats/rivalries", "/players", "/events/live"]) {
    const plan = getRouteDataPlan(route);
    expect([...plan.required, ...plan.optional]).not.toContain("beer-statistics");
  }
});
it("does not disguise errors or a wrong-scope payload as empty data", async () => {
  expect(() => mapBeerStatistics(payload(2026), "all-time")).toThrow();
  expect(() => mapBeerStatistics(null, "all-time")).toThrow();
  expect(() => mapBeerStatistics({ ...payload(), brands: null }, "all-time")).toThrow();
  mocks.rpc.mockResolvedValue({ data: null, error: new Error("timeout") });
  await expect(getBeerStatistics(2026)).rejects.toThrow("timeout");
});
it("retains identical global brand image paths through All-Time and season mapping", () => {
  const brands = [{ brand: "Königshof", imagePath: "same.webp", players: [], eventDetails: [] }];
  expect(mapBeerStatistics({ ...payload(), brands }, "all-time").brands[0].imagePath).toBe("same.webp");
  expect(mapBeerStatistics({ ...payload(2026), brands }, 2026).brands[0].imagePath).toBe("same.webp");
});
it("extends the single read with explicit joins and all-pair unlucky data", () => {
  const sql=readFileSync("supabase/migrations/202610200073_beer_statistics_v2.sql","utf8");
  const read=sql.slice(sql.indexOf("create or replace function public.get_beer_statistics_dashboard"));
  expect(read).not.toMatch(/\\b(?:insert into|update public|delete from)\\b/i);
  expect(read).toContain("from player_details where attempts>=2 and effect>0");
  expect(read).toContain("left join brand_performance p on p.beer_brand=c.beer_brand");
  expect(read).toContain("q.attempt_id");
  expect(read).toContain("'eventDetails'");
  expect(read).toContain("'imagePath'");
});
it("keeps the SQL read-only, snapshot-based and tied to canonical eligibility", () => {
  const sql = readFileSync("supabase/migrations/202610160072_beer_statistics.sql", "utf8");
  expect(sql).toContain("public.official_event_attempts");
  expect(sql).toContain("g.normalized_name");
  expect(sql).toContain("extract(year from start_date)::integer = p_season_year");
  expect(sql).toContain("security invoker");
  expect(sql).not.toMatch(/\b(?:insert into|update public|delete from|create trigger|create index)\b/i);
  expect(sql.replace(/--[^\n]*/g, "")).not.toContain("events.beer_brand");
  expect(sql).not.toContain("historical_attempts");
});
