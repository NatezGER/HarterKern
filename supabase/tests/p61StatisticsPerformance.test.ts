import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration058 = readFileSync(new URL(
  "../migrations/202609210058_statistics_performance_compare_polish.sql",
  import.meta.url,
), "utf8");
const migration059 = readFileSync(new URL(
  "../migrations/202609210059_compare_scoring_two_in_sixty_fix.sql",
  import.meta.url,
), "utf8");
const sql = `${migration058}\n${migration059}`;

describe("PR #61 statistics performance and semantics", () => {
  it("keeps productive migrations immutable and versions the replaced functions", () => {
    expect(migration058).toContain("rename to get_advanced_statistic_player_metrics_v57");
    expect(migration058).toContain("rename to get_player_compare_metric_bundle_v57");
    expect(migration058).toContain("two-in-sixty-best-five");
    expect(migration058).toContain("pair_position <= 5");
    expect(migration058).not.toMatch(/alter\s+function\s+public\.get_unified_statistics_dashboard_v56/i);
    expect(migration059).toMatch(/create or replace function public\.get_statistics_sequence_metrics/);
    expect(migration059).toMatch(/create or replace function public\.get_advanced_statistics_dashboard/);
  });

  it("uses one scope-first sequence source for event patterns and exact glitches", () => {
    expect(sql).toContain("get_statistics_sequence_metrics");
    expect(sql).toContain("partition by player_id, event_id order by submitted_at, id");
    expect(sql).toContain("time_hundredths = previous_time");
    expect(sql).toContain("not coalesce(previous_invalid, true)");
    expect(sql).toContain("from player_features where fast_starter_events >= 1");
  });

  it("keeps the fastest-three compare value canonical and pair-scoped", () => {
    expect(sql).toContain("from public.qualified_official_times q");
    expect(sql).toContain("from public.season_qualified_official_times q");
    expect(sql).toContain("q.player_id = any(normalized_player_ids)");
    expect(sql).toContain("select 'fastest-three'::text metric_key");
  });

  it("reuses the canonical overlapping 180-second 2-in-60 rule", () => {
    expect(sql).toContain("partition by player_id, event_id order by submitted_at, id");
    expect(sql).toContain("submitted_at - previous_submitted_at <= interval '180 seconds'");
    expect(sql).toContain("where not is_dnf and time_hundredths is not null");
    expect(sql).toContain("select 'two-in-sixty-total'::text");
    expect(migration059).toContain("select 'two-in-sixty-best'::text");
    expect(migration059).toContain("min(pair_time)::numeric best_pair_time");
    expect(migration059).not.toContain("two-in-sixty-best-five");
    expect(migration059).not.toContain("pair_position <= 5");
    expect(migration059).not.toContain("sample_count >= 5");
  });

  it("starts leadership changes after the third regular player without changing rivalry views", () => {
    expect(sql).toContain("where qualification_rank = 3");
    expect(sql).toContain("(a.submitted_at, a.id) > (q.qualification_at, q.qualification_id)");
    expect(sql).not.toMatch(/create\s+or\s+replace\s+view\s+public\.rivalry_pair_events/i);
    expect(sql).not.toMatch(/create\s+or\s+replace\s+view\s+public\.event_direct_lead_takeovers/i);
  });

  it("removes duplicate dashboard keys and event participation from the new cards", () => {
    expect(sql).toContain("where metric->>'key' not in ('event-breaks', 'takeovers')");
    expect(sql).toContain("'event-participations', 'fast-starter'");
    expect(sql).not.toContain("'near-repeat', 'event-participations'");
  });

  it("filters career and historical rivalry metrics at the Trophy payload boundary", () => {
    expect(sql).toContain("and (p_event_id is null or (\n      metric_key not like 'badge-%'");
    expect(sql).toContain("and (p_event_id is null or (\n      metric->>'key' not like 'badge-%'");
    expect(sql).toContain("metric_key not like 'badge-%'");
    expect(sql).toContain("metric_key not like 'wr-%'");
    expect(sql).toContain("metric_key not like 'rivalry-%'");
    expect(sql).toContain("metric->>'key' not like 'badge-%'");
    expect(sql).toContain("metric->>'key' not like 'wr-%'");
    expect(sql).toContain("metric->>'key' not like 'rivalry-%'");
    expect(migration058.match(/'pb-jump', 'rare-hunter', 'nemesis', 'favorite-opponent'/g))
      .toHaveLength(2);
    expect(migration059.match(/'pb-jump', 'rare-hunter', 'nemesis', 'favorite-opponent'/g))
      .toHaveLength(1);
  });
});
