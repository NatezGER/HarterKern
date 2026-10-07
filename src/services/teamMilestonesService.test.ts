import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc }) }));
import { getTeamMilestones } from "./teamMilestonesService";
import { dataGroupCache, getRouteDataPlan, loadDataGroup, groupsForRealtimeTable, invalidateDataGroups, shouldRefreshDataGroup } from "./dataGroupService";
beforeEach(() => { rpc.mockReset(); dataGroupCache.invalidate(); });
describe("team milestones isolated read", () => {
  it.each(["all-time" as const, 2026])("maps %s with one RPC", async season => {
    rpc.mockResolvedValue({ data: { validAttempts: 10, teamTimeHundredths: 2784, playerCount: 10 }, error: null });
    expect(await getTeamMilestones(season)).toEqual({ season, validAttempts: 10, teamTimeHundredths: 2784, playerCount: 10 });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("get_team_milestones_snapshot", { p_season_year: season === "all-time" ? null : season });
  });
  it("preserves partial and empty teams without inventing a sum", async () => {
    rpc.mockResolvedValueOnce({ data: { validAttempts: 2, teamTimeHundredths: 555, playerCount: 2 }, error: null })
      .mockResolvedValueOnce({ data: { validAttempts: 0, teamTimeHundredths: null, playerCount: 0 }, error: null });
    expect((await getTeamMilestones()).playerCount).toBe(2);
    expect((await getTeamMilestones(2026)).teamTimeHundredths).toBeNull();
  });
  it("deduplicates, separates seasons and invalidates within the shared cache", async () => {
    rpc.mockResolvedValue({ data: { validAttempts: 0, teamTimeHundredths: null, playerCount: 0 }, error: null });
    const first = loadDataGroup("team-milestones");
    expect(loadDataGroup("team-milestones")).toBe(first);
    await first;
    expect(shouldRefreshDataGroup("team-milestones", "all-time")).toBe(false);
    await loadDataGroup("team-milestones", 2026);
    expect(rpc).toHaveBeenCalledTimes(2);
    invalidateDataGroups(["team-milestones"]);
    await loadDataGroup("team-milestones");
    expect(rpc).toHaveBeenCalledTimes(3);
  });
  it("does not cache errors", async () => {
    rpc.mockResolvedValueOnce({ error: new Error("timeout"), data: null })
      .mockResolvedValueOnce({ error: null, data: { validAttempts: 0, teamTimeHundredths: null, playerCount: 0 } });
    await expect(loadDataGroup("team-milestones")).rejects.toThrow("timeout");
    await expect(loadDataGroup("team-milestones")).resolves.toBeDefined();
  });
  it("loads exactly the two milestone snapshots, with no Unified/Performance requests", async () => {
    rpc.mockImplementation(async (name: string) => ({ error: null, data: name === "get_team_milestones_snapshot"
      ? { validAttempts: 0, teamTimeHundredths: null, playerCount: 0 }
      : { endings: [], progress: { reached_count: 0, total_count: 100, open_endings: [] } } }));
    const plan = getRouteDataPlan("/stats/milestones");
    await Promise.all([...plan.required, ...plan.optional].map(group => loadDataGroup(group)));
    expect(rpc.mock.calls.map(call => call[0]).sort()).toEqual(["get_most_wanted_snapshot", "get_team_milestones_snapshot"]);
    for (const table of ["players", "events", "attempts", "historical_attempts"]) {
      expect(groupsForRealtimeTable(table)).toContain("team-milestones");
    }
    for (const path of ["/stats", "/stats/performance", "/stats/badges", "/stats/rivalries"]) {
      const route = getRouteDataPlan(path);
      expect([...route.required, ...route.optional]).not.toContain("team-milestones");
    }
  });
  it("projects canonical SQL sources, one PB per player and only ten sorted PBs", () => {
    const sql = readFileSync("supabase/migrations/202610070065_team_milestones_snapshot.sql", "utf8");
    expect(sql).toContain("public.qualified_official_times");
    expect(sql).toContain("public.season_qualified_official_times");
    expect(sql).toContain("not is_guest and player_id is not null");
    expect(sql).toContain("min(time_hundredths)");
    expect(sql).toContain("group by player_id");
    expect(sql).toMatch(/order by best_hundredths, player_id\s+limit 10/);
    expect(sql).toContain("sum(best_hundredths)");
    expect(sql).toContain("public.global_statistics");
    expect(sql).toContain("public.season_global_statistics");
    expect(sql).toContain("security invoker");
    expect(sql).not.toMatch(/get_unified|update |insert into|delete from|trigger/i);
  });
});
