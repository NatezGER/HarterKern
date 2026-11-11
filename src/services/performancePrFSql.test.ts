import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const sql=readFileSync("supabase/migrations/202611110080_performance_pr_f.sql","utf8");
it("defines only read functions and canonical lead views, retaining the public ranking signature",()=>{
 expect(sql).not.toMatch(/\b(insert into|update public|delete from|alter table|create trigger|security definer)\b/i);
 expect(sql).toContain("get_statistics_performance_dashboard(p_season_year integer default null)");
 expect(sql).toContain("grant execute on function public.get_performance_metric_details(integer,text,uuid) to anon,authenticated");
 expect(sql).toContain("where valid_number=2");expect(sql).toContain("null::integer prior_event_best from initial");
});
it("omits retired calculations and base evidence; bounds details without bounding total counts",()=>{
 for(const key of ["late-bloomer","performance-endspurt","performance-form-rise","performance-form-decay","performance-fastest-consistent"])expect(sql).not.toContain(key);
 expect(sql).toContain("get_performance_event_metrics_v2(p_season_year,null)");
 expect(sql).toContain("get_performance_development_metrics_v2(p_season_year,null)");
 expect(sql).toContain("sum(pair_count)::numeric events");expect(sql).toContain("sum(takeovers)::numeric takeovers");
 expect(sql).toContain("evidence_position<=5");expect(sql).toContain("opponent_position<=5");
 expect(sql).toContain("filter(where p_details_player=s.player_id)");
});
