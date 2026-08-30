import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL(
  "../migrations/202608300038_p115_rules_event_fixes.sql",
  import.meta.url,
)), "utf8");
const awardMigration = readFileSync(fileURLToPath(new URL(
  "../migrations/202608120024_pr9c1_qualified_events.sql",
  import.meta.url,
)), "utf8");

function section(start: string, end: string) {
  return migration.slice(migration.indexOf(start), migration.indexOf(end));
}

describe("P11.5 competition ranking and event finality", () => {
  it("uses one final-only standings view with competition rank", () => {
    const standings = section("create view public.event_final_standings",
      "grant select on public.event_final_standings");
    expect(standings).toContain("e.status = 'closed'");
    expect(standings).toContain("rank() over");
    expect(standings).not.toContain("dense_rank() over");
    expect(standings).toContain("order by eligible.best_time_hundredths");
    expect(standings).toContain("eligible.first_best_at");
    expect(standings).toContain("where eligible.best_time_hundredths is not null");
  });

  it("derives podium and unique legacy winner fields from final ties safely", () => {
    const podium = section("create or replace view public.event_podium",
      "create or replace function public.sync_close_event");
    expect(podium).toContain("public.event_final_standings");
    expect(podium).toContain("rank between 1 and 3");
    const close = section("create or replace function public.sync_close_event",
      "create or replace view public.public_hall_of_fame");
    expect(close).toContain("case when count(*) = 1 then (array_agg(player_id))[1] end");
    expect(close).toContain("winner_player_id = selected_player");
    expect(close).toContain("status = 'closed'");
  });

  it("uses competition rank for all-time and season standings", () => {
    const hall = section("create or replace view public.public_hall_of_fame",
      "create or replace view public.season_hall_of_fame");
    const season = section("create or replace view public.season_hall_of_fame",
      "create or replace function public.get_player_season_profile");
    const profile = section("create or replace function public.get_player_season_profile",
      "select public.sync_all_player_badge_award_ledgers()");
    for (const sql of [hall, season, profile]) {
      expect(sql).toContain("rank() over");
      expect(sql).not.toContain("dense_rank() over");
    }
  });

  it("keeps DNF and non-qualifying attempts as explicit streak breakers", () => {
    expect(awardMigration).toMatch(/case when is_dnf or time_hundredths is null or time_hundredths >= 300/);
    expect(awardMigration).toMatch(/flawless_groups[\s\S]*sum\(case when is_dnf then 1 else 0 end/);
    expect(awardMigration).toMatch(/sub3_streaks[\s\S]*where not is_dnf and time_hundredths is not null and time_hundredths < 300/);
  });

  it("rebuilds the persisted ledger after finality rules change", () => {
    expect(migration).toContain("select public.sync_all_player_badge_award_ledgers()");
    expect(migration).not.toMatch(/statement_timeout/i);
  });
});
