import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL(
  "../migrations/202608300039_p115_badge_expansion_admin_polish.sql",
  import.meta.url,
)), "utf8");
const foundation = readFileSync(fileURLToPath(new URL(
  "../migrations/202608020017_pr8a_badges_trophies_most_wanted.sql",
  import.meta.url,
)), "utf8");

function section(start: string, end: string) {
  return migration.slice(migration.indexOf(start), migration.indexOf(end));
}

describe("P11.5 badge expansion architecture", () => {
  it("preserves the lifetime valid-attempt family and adds separate keys", () => {
    for (const [key, threshold] of [["valid-attempts-bronze", 10],
      ["valid-attempts-silver", 50], ["valid-attempts-gold", 100],
      ["valid-attempts-diamond", 500]] as const) {
      expect(foundation).toContain(`('${key}'`);
      expect(foundation).toMatch(new RegExp(`${key.replaceAll("-", "\\-")}'[\\s\\S]{0,180} ${threshold},`));
      expect(migration).not.toContain(`('${key}'`);
    }
    expect(migration).toContain("'event-attempts-bronze'");
  });

  it.each([
    ["event-attempts", [5, 10, 20, 30], 150],
    ["rapid-fire", [2, 4, 6, 10], 154],
    ["teamwork", [1, 3, 5, 10], 158],
  ] as const)("defines all four %s stages with their thresholds", (family, thresholds, firstSort) => {
    for (const [index, tier] of ["bronze", "silver", "gold", "diamond"].entries()) {
      expect(migration).toContain(`('${family}-${tier}'`);
      expect(migration).toMatch(new RegExp(
        `'${family}-${tier}'[\\s\\S]{0,240} ${thresholds[index]}, ${firstSort + index},`,
      ));
    }
  });

  it("uses valid event attempts and their threshold attempt as evidence", () => {
    const eligibility = section("create view public.p115_badge_expansion_awards",
      "revoke all on public.p115_badge_expansion_awards");
    expect(eligibility).toContain("a.status = 'approved'");
    expect(eligibility).toContain("a.deleted_at is null");
    expect(eligibility).toContain("not a.is_dnf and not a.is_ak");
    expect(eligibility).toContain("partition by player_id, event_id");
    expect(eligibility).toContain("definitions.threshold = progress.event_valid_attempts");
    expect(eligibility).toContain("progress.source_id source_attempt_id");
  });

  it("uses an inclusive rolling hour without historical timestamps", () => {
    const eligibility = section("create view public.p115_badge_expansion_awards",
      "revoke all on public.p115_badge_expansion_awards");
    expect(eligibility).toContain("current_attempt.occurred_at - interval '60 minutes'");
    expect(eligibility).toContain("window_attempt.occurred_at >=");
    expect(eligibility).toContain("definitions.threshold = progress.window_valid_attempts");
    expect(eligibility).not.toContain("historical_attempts");
    expect(eligibility).toContain("valid_attempts as not materialized");
  });

  it("derives final Teamwork once per event from central standings", () => {
    const eligibility = section("create view public.p115_badge_expansion_awards",
      "revoke all on public.p115_badge_expansion_awards");
    expect(eligibility).toContain("public.event_final_standings standings");
    expect(eligibility).toContain("teammate.best_time_hundredths = standings.best_time_hundredths");
    expect(eligibility).toContain("standings.best_time_hundredths is not null");
    expect(eligibility).toContain("partition by player_id order by occurred_at, event_id");
  });

  it("keeps reads ledger-only and extends the existing sync and triggers", () => {
    const source = section("create or replace view public.player_badge_award_sync_source",
      "revoke all on public.player_badge_award_sync_source");
    expect(source).toContain("public.p115_badge_expansion_awards");
    expect(migration).toContain("select public.sync_all_player_badge_award_ledgers()");
    expect(migration).toContain("refresh_badge_ledger_after_attempt_insert");
    expect(migration).toContain("refresh_badge_ledger_after_attempt_update");
    expect(migration).toContain("refresh_badge_ledger_after_participant_change");
    expect(migration).not.toMatch(/get_player_visible_badges|create or replace function public.get_badge_rarity/);
  });
});
