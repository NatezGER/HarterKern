import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const sql = read("supabase/migrations/202610060063_stats_most_wanted_isolation.sql");
const parity = read("supabase/tests/read_only/statistics_most_wanted_parity.sql");

describe("Most Wanted SQL isolation (static, not a PostgreSQL runtime test)", () => {
  it("shares one qualified population without expanding legacy/decorative read models", () => {
    expect(sql).toContain("qualified as materialized");
    expect(sql).toContain("ranked as materialized");
    expect(sql).toContain("language sql stable security invoker");
    for (const name of ["qualified_official_times", "event_attempt_details", "most_wanted_endings",
      "most_wanted_progress", "event_podium", "player_pb_progression", "world_record_progression",
      "get_unified_statistics_dashboard", "badge_definitions", "rivalry_pair_events"]) {
      expect(sql).not.toContain("public." + name);
    }
    expect(sql).not.toMatch(/security definer|statement_timeout|\b(insert into|update public|delete from|drop|trigger)\b/i);
    expect(sql).toContain("to anon, authenticated");
  });

  it("numbers the canonical approved population before DNF, AK or participant qualification", () => {
    const numbered = sql.split("), qualified as materialized")[0];
    expect(numbered).toContain("partition by a.event_id, a.player_id, a.guest_id");
    expect(numbered).toContain("order by a.submitted_at, a.id");
    expect(numbered).toContain("a.status = 'approved' and a.deleted_at is null");
    expect(numbered).not.toContain("not a.is_dnf");
    expect(numbered).not.toContain("not a.is_ak");
    expect(numbered).toContain("case when e.id is null then 0");
    expect(sql).toContain("not a.is_dnf and a.time_hundredths is not null and not a.is_ak");
    expect(sql).toContain("not p.is_ak and not p.is_archived");
    expect(sql).toContain("a.guest_id is not null and g.id is not null");
    expect(sql).not.toMatch(/e.status\s*=/);
  });

  it("preserves historical eligibility, seasonal membership, guest identities and first-hit ordering", () => {
    expect(sql).toContain("h.deleted_at is null and not h.out_of_competition");
    expect(sql).toContain("(h.is_guest or (h.player_id is not null and not p.is_ak and not p.is_archived))");
    expect(sql).toContain("h.attempt_date::timestamp at time zone 'Europe/Berlin'");
    expect(sql).toContain("'historical_attempt'::text, 1::integer, h.sort_order, false");
    expect(sql).toContain("'attempt'::text source_type, 2::integer source_priority");
    expect(sql).toContain("extract(year from e.start_date)::integer = p_season_year");
    expect(sql).toContain("extract(year from h.attempt_date)::integer = p_season_year");
    expect(sql).toContain("order by occurred_at, source_priority, source_order, source_id");
    expect(sql).toContain("concat('guest:', display_name)");
    expect(sql).toContain("generate_series(0, 99)");
    expect(sql).toContain("order by hit_count desc, ending");
    expect(sql).toContain("select min(hit_count) from endings where achieved");
  });

  it("embeds the exact current migration and read-only parity in rollback scripts", () => {
    for (const file of ["preflight", "runtime_check"]) {
      const script = read("supabase/tests/read_only/statistics_most_wanted_" + file + ".sql");
      expect(script.startsWith("BEGIN;")).toBe(true);
      expect(script).toContain(sql.trim());
      expect(script.trim().endsWith("ROLLBACK;")).toBe(true);
      expect(script).toContain("SET LOCAL ROLE authenticated;");
      expect(script.match(/EXPLAIN \(ANALYZE, BUFFERS, TIMING OFF\)/g)).toHaveLength(2);
      const afterMigration = script.slice(script.indexOf("SET LOCAL ROLE"));
      expect(afterMigration).not.toMatch(/\b(insert|update|delete|truncate|alter|drop|create)\s/gi);
      if (file === "preflight") expect(script).toContain(parity.trim());
      else expect(afterMigration).not.toMatch(/qualified_official_times|most_wanted_endings|most_wanted_progress|unified/i);
    }
    for (const name of ["matrix_first_hit_counts_guests_history", "progress_missing_common_rarest",
      "display_hits_order_attempt_number", "least_common_hit_count", "SKIP"]) expect(parity).toContain(name);
    expect(parity).not.toMatch(/\b(insert|update|delete|truncate|alter|drop|create)\s/gi);
  });
});
