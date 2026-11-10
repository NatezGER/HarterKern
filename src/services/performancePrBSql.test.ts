import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatMetricValue } from "../utils/statMetricFormat";

const sql = readFileSync("supabase/migrations/202611100077_performance_pr_b.sql", "utf8");

describe("PR B SQL contracts (static, not PostgreSQL execution)", () => {
  it("only defines isolated, read-only performance functions", () => {
    expect(sql.match(/create (?:or replace )?function public\.\w+/g)).toEqual([
      "create function public.get_performance_event_metrics",
      "create or replace function public.get_statistics_performance_dashboard",
    ]);
    expect(sql).not.toMatch(/\b(insert into|update public|delete from|alter table|create trigger|drop)\b/i);
    expect(sql.match(/security invoker/g)).toHaveLength(2);
  });
  it("keeps the shared Fast Starter calculation and gates only its performance projection", () => {
    expect(sql).toContain("public.get_statistics_sequence_metrics(null, p_season_year, null)");
    expect(sql).toContain("sample_count >= 2");
    expect(sql).toContain("count(distinct event_id)");
    expect(sql).toContain("where r.is_rivalry_event and e.status='closed'");
  });
  it("reuses the current canonical leadership window and requires a prior strict pairwise deficit", () => {
    expect(sql).toContain("join public.event_lead_windows w using(event_id)");
    expect(sql).not.toMatch(/qualification_order|first_valid as|position=3/);
    expect(sql).toContain("s.before_pb > s.opponent_pb and s.time_hundredths < s.opponent_pb");
    expect(sql).toContain("s.before_pb is not null and s.opponent_pb is not null");
    expect(sql).toContain("(s.submitted_at,s.attempt_id) >= (w.qualification_started_at,w.qualification_attempt_id)");
    expect(sql).toContain("percentile_cont(0.5) within group (order by gain)");
    expect(sql).toContain("attempt_count - attempt_count / 4");
  });
  it("renders a real zero gain without changing ordinary time formatting", () => {
    expect(formatMetricValue(0, "time-gain")).toBe("0,00 s");
    expect(formatMetricValue(null, "time-gain")).toBe("—");
    expect(formatMetricValue(0, "time")).toBe("—");
  });
});
