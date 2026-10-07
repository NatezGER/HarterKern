import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const sql = read("supabase/migrations/202610060064_stats_badges_prestige_isolation.sql");
const parity = read("supabase/tests/read_only/statistics_badges_prestige_parity.sql");
describe("badge/prestige SQL boundaries (static, not a database compile test)", () => {
  it("does not expand legacy eligibility or unrelated dashboards", () => {
    for (const name of ["get_unified_statistics_dashboard", "get_advanced_statistic_player_metrics",
      "public_player_badges", "player_badge_awards", "player_badge_award_sync_source",
      "event_attempt_details", "player_bingo_statistics", "prestige_activity_feed", "visible_player_badges"]) {
      expect(sql).not.toContain("public." + name);
    }
    expect(sql.match(/language sql stable security invoker/g)).toHaveLength(2);
    expect(sql).not.toMatch(/security definer|statement_timeout|insert into|update public|delete from|create trigger/i);
    for (const source of ["player_badge_award_ledger", "world_record_history", "player_pb_history", "group_milestone_progress"]) {
      expect(sql).toContain("public." + source);
    }
  });
  it("retains nine metrics, qualification, family dedupe and competition ranking", () => {
    for (const key of ["bingo-fields","rare-hunter","badge-total","badge-bronze","badge-silver",
      "badge-gold","badge-diamond","badge-positive","badge-consolation"]) {
      expect(sql).toContain("'" + key + "'::text");
    }
    for (const rule of ["count(distinct b.ending)", "p.players <= 3",
      "not h.out_of_competition and not h.is_guest", "not a.is_dnf and not a.is_ak",
      "p_season_year is null and definitions.is_active", "definitions.design_variant = 'standard'",
      "partition by metric_key order by value desc) placement", "r.display_position <= 10",
      "l.source_awarded_at, l.award_key", "wr.record_id = pb.source_id", "where ppb.family_position = 1"]) {
      expect(sql).toContain(rule);
    }
  });
  it("distinguishes proven ledger differences from actual canonical failures", () => {
    for (const classification of ["FAIL_CANONICAL_NON_BADGE", "FAIL_NEW_BADGE_WITHOUT_CANONICAL_LEDGER_PROOF",
      "EXPECTED_MATRIX_GLITCH_LEDGER_VS_LEGACY", "EXPECTED_CANONICAL_LEDGER_TIMESTAMP",
      "EXPECTED_LEDGER_ORDER_SHIFT", "REVIEW_OTHER_LEDGER_DIFFERENCE"]) expect(parity).toContain(classification);
  });
  it("embeds the exact current migration and ends both complete scripts in rollback", () => {
    for (const name of ["preflight", "runtime_check"]) {
      const script = read("supabase/tests/read_only/statistics_badges_prestige_" + name + ".sql");
      expect(script.startsWith("BEGIN;")).toBe(true);
      expect(script.trim().endsWith("ROLLBACK;")).toBe(true);
      expect(script).toContain(sql.trim());
      const checks = script.slice(script.indexOf("SET LOCAL ROLE authenticated;"));
      expect(checks).not.toMatch(/insert into|update public|delete from|truncate|alter |drop |create /i);
      expect(checks.match(/EXPLAIN \(ANALYZE, BUFFERS, TIMING OFF\)/g)).toHaveLength(4);
      if (name === "preflight") expect(script).toContain(parity.trim());
      else expect(checks).not.toContain("get_unified_statistics_dashboard");
    }
  });
  it("removes the hidden Unified hook and guards obsolete scopes", () => {
    const page = read("src/pages/StatsBadgesPage.tsx");
    expect(page).not.toMatch(/useStatisticDashboard|MostWantedMatrix|usePerformanceDashboard|useRivalryHub/);
    expect(page).not.toContain('useDataGroup("badge-statistics")');
    expect(read("src/components/stats/BadgeRankingSections.tsx")).toContain("data.badgeStatistics?.season === season");
    expect(page).toContain("AdminBadgeCatalogSlot unlocked={unlocked}");
  });
});
