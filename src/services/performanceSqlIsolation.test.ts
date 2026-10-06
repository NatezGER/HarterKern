import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { statisticMetricRegistry } from "@/constants/statMetricRegistry";
const sql = readFileSync("supabase/migrations/202610050062_statistics_performance_isolation.sql", "utf8");
const smoke = readFileSync("supabase/tests/read_only/statistics_performance_isolation.sql", "utf8");
describe("Performance SQL boundary (static, not a PostgreSQL compile test)", () => {
  it("does not reach Unified, advanced-global, badge, pair, Trophy or Most-Wanted paths", () => {
    for (const name of ["get_unified_statistics_dashboard", "get_advanced_statistics_dashboard",
      "get_advanced_statistic_player_metrics", "player_badge_award_ledger", "badge_definitions",
      "rivalry_pair_events", "event_pair_attempt_states", "event_pair_summaries",
      "most_wanted_endings", "most_wanted_progress", "get_trophy_event_dashboard"]) {
      expect(sql).not.toContain("public." + name);
    }
    expect(sql).toContain("stable security invoker");
    expect(sql).not.toMatch(/security definer|statement_timeout|drop |insert into|update public/i);
    expect(sql).toContain("get_statistics_sequence_metrics(null, p_season_year, null)");
    expect(sql).toContain("get_qualified_leadership_metrics(null, p_season_year, null)");
    expect(sql).toContain("events.status = 'closed'");
  });
  it("keeps all visible Performance keys in the exact-parity SQL regression check", () => {
    const keys = statisticMetricRegistry.filter(({ group, scopes }) =>
      ["performance","consistency","volume","event","records"].includes(group) && scopes.includes("all-time"))
      .map(({ key }) => key);
    for (const key of keys) expect(smoke).toContain("'" + key + "'");
    expect(keys).toHaveLength(34);
    expect(smoke).toContain("differing_metric_keys");
    expect(smoke).toContain("chart_parity");
    expect(smoke).toContain("counter_parity");
  });
  it("references the shared qualified source rather than a recursive regular population", () => {
    expect(sql).toMatch(/regular_official as \(\s*select \* from official where player_id is not null and not is_guest/);
    expect(sql).not.toMatch(/p_event_id|p_player_ids/);
    expect(sql).toContain("m.event_date");
    expect(sql).toContain("concat(event_name, ' · ', event_date)");
    expect(sql).toContain("having count(*) = 5");
    expect(sql).toContain("window_size = 5 and valid_size = 5");
  });
  it("embeds the current additive migration and read-only checks in the rollback preflight", () => {
    const preflight = readFileSync("supabase/tests/read_only/statistics_performance_preflight.sql", "utf8").replace(/\r\n/g, "\n");
    expect(preflight.startsWith("BEGIN;")).toBe(true);
    expect(preflight).toContain(sql.replace(/\r\n/g, "\n").trim());
    expect(preflight).toContain(smoke.replace(/\r\n/g, "\n").trim());
    expect(preflight.trim().endsWith("ROLLBACK;")).toBe(true);
    expect(smoke).not.toMatch(/\b(insert|update|delete|truncate|alter|drop|create)\s/gi);
  });
});
