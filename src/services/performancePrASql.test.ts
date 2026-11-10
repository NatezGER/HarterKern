import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const sql = read("supabase/migrations/202611100076_performance_pr_a.sql");
const baseline = read("supabase/migrations/202610150069_statistics_overview_event_performance.sql");

describe("PR A SQL contract (static; pgTAP execution is separate)", () => {
  it("only replaces the isolated performance read and leaves shared sequence/badges alone", () => {
    expect(sql.match(/create or replace function public\.[\w]+/g)).toEqual(["create or replace function public.get_statistics_performance_dashboard"]);
    expect(sql).toContain("language sql stable security invoker");
    expect(sql).not.toMatch(/\b(insert into|update public|delete from|alter table|drop|trigger)\b/i);
    expect(sql).toContain("union all select * from public.get_statistics_sequence_metrics(null, p_season_year, null)");
    expect(sql).toContain("from players where attempt_count >= 10");
    expect(sql).toContain("abs(time_hundredths - previous_time) <= 10");
    expect(sql).toContain("from near_repeat where pairs >= 5");
  });
  it("preserves event eligibility, strict thresholds, ranking and the five-window value", () => {
    const block = (text: string, a: string, b: string) => text.slice(text.indexOf(a), text.indexOf(b, text.indexOf(a)));
    expect(block(sql, "), event_attempts as (", "), player_times as (")).toBe(block(baseline, "), event_attempts as (", "), player_times as ("));
    expect(block(sql, "), best_windows as (", "), best_window_evidence as (")).toBe(block(baseline, "), best_windows as (", "), event_features as ("));
    expect(block(sql, "), ranked as (", "), totals as (")).toBe(block(baseline, "), ranked as (", "), totals as ("));
    expect(sql).toContain("rows between 4 preceding and current row");
    expect(sql).toContain("order by player_id, window_average, event_date, event_id, attempt_number");
    expect(sql).toContain("'attemptIds', window_attempt_ids");
  });
  it("projects canonical first-hit sources and keeps guests' discoveries assigned to guests", () => {
    expect(sql).toContain("from public.most_wanted_endings");
    expect(sql).toContain("from public.season_most_wanted_endings");
    expect(sql).toContain("season_year = p_season_year");
    expect(sql).toContain("achieved and not first_is_guest");
    expect(sql).toContain("rank() over (partition by metric_key order by");
    const diagnostic = read("supabase/tests/read_only/performance_pr_a_glitch_diagnosis.sql");
    expect(diagnostic).toContain("begin read only;");
    expect(diagnostic).not.toMatch(/\b(insert into|update public|delete from|create|alter|drop)\s/i);
  });
});
