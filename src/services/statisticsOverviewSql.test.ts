import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { statisticMetricByKey } from "@/constants/statMetricRegistry";

const sql = readFileSync("supabase/migrations/202610150069_statistics_overview_event_performance.sql", "utf8");
const performance = sql.split("create or replace function public.get_statistics_performance_dashboard")[1]
  .split("create or replace function public.get_statistics_badge_dashboard")[0];
const cte = (name: string) => performance.split("), " + name + " as (")[1]?.split("\n),")[0];

describe("069 static SQL contracts (not a PostgreSQL runtime test)", () => {
  it("uses canonical regular event attempts for valid-only threshold, event-max and repeat populations", () => {
    expect(cte("event_attempts")).toContain("public.official_event_attempts");
    expect(cte("valid_event_attempts")).toContain("not is_dnf and time_hundredths is not null");
    for (const name of ["threshold_player", "threshold_totals", "event_max", "exact_time_counts"]) {
      expect(cte(name)).toContain("from valid_event_attempts");
      expect(cte(name)).not.toContain("from official ");
    }
    for (const [key, limit] of [["sub5", 500], ["sub4", 400], ["sub3", 300], ["sub25", 250], ["sub2", 200]]) {
      expect(cte("threshold_player")).toContain("time_hundredths < " + limit);
      expect(cte("metric_values")).toContain(key + " / threshold_count * 100");
      expect(cte("metric_values")).toContain("where " + key + " > 0");
    }
    expect(cte("event_player")).toContain("where not is_dnf and time_hundredths is not null");
    expect(cte("streak_grouped")).toContain("from event_attempts");
  });
  it("applies sample ordering before top-ten selection without changing sporting rank", () => {
    const ranked = cte("ranked")!;
    expect(ranked.split("row_number()")[0]).not.toContain("sample_count");
    expect(ranked.split("row_number()")[1]).toContain("m.sample_count desc nulls last");
    expect(performance).toContain("r.display_position <= 10");
  });
  it("chooses each player's own mode and fastest tied example, retaining the event date detail", () => {
    expect(cte("exact_time_counts")).toContain("group by player_id, time_hundredths");
    expect(cte("common_players")).toContain("order by player_id, hits desc, time_hundredths");
    expect(cte("players")).toContain("c.time_hundredths common_time");
    expect(cte("metric_values")).toContain("common_time / 100.0");
    expect(cte("metric_values")).toContain("concat(event_name, ' · ', event_date)");
  });
  it("keeps historical record metrics and closed-event leadership isolated", () => {
    expect(cte("regular_official")).toContain("from official");
    expect(performance).toContain("get_statistics_sequence_metrics(null, p_season_year, null)");
    expect(performance).toContain("get_qualified_leadership_metrics(null, p_season_year, null)");
    expect(performance).toContain("events.status = 'closed'");
    expect(performance).not.toMatch(/public\.(player_bingo_lines|player_badge_award_ledger|rivalry_pair_events)/);
    expect(sql).not.toMatch(/\b(insert into|update public|delete from|create trigger|security definer)\b/i);
  });
  it("reuses canonical Bingo lines with exclusive 1/2/3/5 weights, not cumulative color flags", () => {
    expect(sql.match(/count\(distinct g.normalized_name\)/g)).toHaveLength(2);
    expect(sql.match(/closed_event_count/g)).toHaveLength(2);
    expect(sql).toContain("from public.player_bingo_lines where p_season_year is null");
    expect(sql).toContain("public.bingo_line_cells c using (ending)");
    expect(sql).toContain("having count(*) = 10");
    for (const threshold of [1, 2, 3, 5]) expect(sql).toContain("minimum_hit_count >= " + threshold);
    expect(sql).toContain("sum(case when qualifies_diamond then 5");
    expect(sql).toContain("when qualifies_gold then 3 when qualifies_silver then 2");
    expect(sql).toContain("when qualifies_bronze then 1 else 0 end)::numeric points");
    expect(sql).toContain("sum(case when minimum_hit_count >= 5 then 5");
    expect(sql).not.toContain("qualifies_bronze::integer +");
    expect(sql).toContain("player_id, points::numeric");
    expect(statisticMetricByKey.get("bingo-lines")).toMatchObject({ scopes: ["all-time", "season"], group: "bingo" });
    expect(statisticMetricByKey.get("bingo-lines")?.compareBlock).toBeUndefined();
  });
});
