import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getRouteDataPlan } from "./dataGroupService";
const read = (p: string) => readFileSync(p,"utf8");
const sql = read("supabase/migrations/202610070066_rivalry_hub_v2.sql");
describe("Rivalry V2 SQL contract (static, not PostgreSQL execution)", () => {
  it("reuses canonical closed pair facts and keeps comparative numerator/denominator aligned", () => {
    expect(sql).toContain("from public.rivalry_pair_events");
    expect(sql).toContain("from public.official_event_attempts");
    expect(sql).toContain("and e.status = 'closed'");
    expect(sql).toContain("public.event_participants");
    expect(sql).toContain("where a.is_valid_time");
    expect(sql).toContain("count(*) filter (where comparable)::integer comparable_h2h_events");
    expect(sql).toContain("sum(direct_takeovers) filter (where comparable)");
    expect(sql).toContain("count(*) filter (where is_rivalry_event)::integer rivalry_length");
    expect(sql).not.toMatch(/span_days|lead_seconds/);
  });
  it("keeps the sole formula numeric, uncapped and deterministically sorted", () => {
    for (const term of ["sqrt(p_takeovers / takeover_threshold)", "ln(p_events)",
      "least(1::numeric, p_takeovers / p_events)", "greatest(0::numeric, p_length - 1)",
      "p_takeovers > 0 and p_events > 0", "else null::numeric end",
      "comparable_h2h_events desc, player_low_id, player_high_id"]) expect(sql).toContain(term);
    expect(sql.match(/create function public\./g)).toHaveLength(2);
    expect(sql).not.toMatch(/security definer|statement_timeout|insert into|update public|delete from|create trigger/i);
  });
  it("does not fan out across statistics tabs or modify awards and existing RPCs", () => {
    for (const name of ["get_unified_statistics_dashboard", "get_statistics_performance_dashboard",
      "get_stats_badges_prestige", "get_player_event_history(", "get_pair_rivalry(",
      "get_rivalry_badge_progress", "player_badge_award_ledger"]) expect(sql).not.toContain(name);
    expect(getRouteDataPlan("/stats/rivalries")).toEqual({ required: ["navigation"], optional: [] });
    const page = read("src/pages/StatsRivalriesPage.tsx");
    expect(page).toContain("useRivalryHubV2(season)");
    expect(page).not.toMatch(/useStatisticDashboard|usePerformanceDashboard|useEffectivePublicData/);
    const ui = read("src/components/stats/RivalryHubContent.tsx");
    expect(ui).not.toMatch(/Math\.sqrt|Math\.log|0\.25|0\.12/);
    expect(ui).toContain("<ProfileAvatar id={p.playerAId}");
    expect(ui).toContain("<ProfileAvatar id={p.playerBId}");
  });
  it("provides a read-only preflight with both requested plans and a final rollback", () => {
    const smoke = read("supabase/tests/read_only/rivalry_hub_v2_preflight.sql");
    expect(smoke).toContain("READ ONLY");
    expect(smoke.match(/EXPLAIN \(ANALYZE, BUFFERS\)/g)).toHaveLength(2);
    expect(smoke).toContain("public.get_rivalry_hub_v2(NULL)");
    expect(smoke).toContain("public.get_rivalry_hub_v2(2026)");
    expect(smoke.trim()).toMatch(/ROLLBACK;$/);
    expect(smoke).not.toMatch(/insert into|update public|delete from|create table|statement_timeout/i);
  });
});
