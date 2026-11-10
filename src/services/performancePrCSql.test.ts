import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const sql = read("supabase/migrations/202611100078_performance_pr_c.sql");
const previous = read("supabase/migrations/202611100077_performance_pr_b.sql");
describe("PR C SQL isolation and calculation contracts (static)", () => {
  it("embeds the complete PR B main query unchanged", () => {
    const body = previous.split("create or replace function public.get_statistics_performance_dashboard")[1].split("as $$")[1].split("$$;")[0].trim().replace(/;$/, "");
    expect(sql).toContain(`with baseline as materialized (\n${body}\n)`);
    expect(sql.match(/create (?:or replace )?function public\.\w+/g)).toEqual([
      "create function public.get_performance_development_metrics", "create or replace function public.get_statistics_performance_dashboard",
    ]);
    expect(sql).not.toMatch(/\b(insert into|update public|delete from|alter table|create trigger|drop)\b/i);
  });
  it("reconstructs previous PBs before scope filtering without including the current attempt", () => {
    expect(sql).toContain("rows between unbounded preceding and 1 preceding");
    expect(sql).toContain("order by occurred_at,source_priority,source_order,source_id");
    expect(sql).toContain("seq-prior_pb_seq length");
    expect(sql).toContain("time_hundredths-prior_pb between 1 and 10");
    expect(sql).toContain("q.occurred_date < make_date(p_season_year+1,1,1)");
    expect(sql).toContain("r.seq>p.seq");
    expect(sql).toContain("not exists(select 1 from ambiguous_days");
  });
  it("shares event transitions and median windows and bounds details after ranking", () => {
    expect(sql).toContain("from public.official_event_attempts");
    expect(sql).toContain("partition by a.player_id,a.event_id");
    expect(sql).toContain("is_valid_time and previous_valid");
    expect(sql).toContain("count(*)::numeric length,min(number)-1 start_number");
    expect(sql).toContain("recent between 6 and 10");
    expect(sql).toContain("having count(*)=10");
    expect(sql.indexOf("display_order<=10")).toBeLessThan(sql.indexOf("'kind','spiral'"));
    expect(sql).toContain("order by seq desc limit 20");
  });
  it("preserves canonical CV but ranks exact means with sporting ties", () => {
    expect(sql).toContain("round(stddev_pop(time_hundredths)/nullif(round(avg(time_hundredths)),0)*100,3)");
    expect(sql).toContain("avg(time_hundredths)::numeric mean");
    expect(sql).toContain("having count(*)>=10");
    expect(sql).toContain("position=ceil(population::numeric/3)");
    expect(sql).toContain("c.cv<=b.cutoff");
    expect(sql).toContain("rank() over(partition by key order by case when key='performance-fastest-consistent' then -value else value end desc)");
  });
});
