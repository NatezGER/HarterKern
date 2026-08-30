import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL(
  "../migrations/202608300037_p115b_persisted_badge_award_ledger.sql",
  import.meta.url,
)), "utf8");

function functionBody(name: string, nextMarker: string) {
  return migration.slice(migration.indexOf(`function public.${name}`),
    migration.indexOf(nextMarker, migration.indexOf(`function public.${name}`)));
}

describe("P11.5 B persisted badge award ledger", () => {
  it("defines an indexed, public-readable ledger with stable award identity", () => {
    expect(migration).toContain("create table public.player_badge_award_ledger");
    expect(migration).toContain("award_key text primary key");
    expect(migration).toContain("player_badge_award_ledger_player_idx");
    expect(migration).toContain("player_badge_award_ledger_badge_player_idx");
    expect(migration).toContain("player_badge_award_ledger_public_read");
    expect(migration).toContain("grant select on public.player_badge_award_ledger to anon, authenticated");
    expect(migration).toContain("source_awarded_at timestamptz not null");
  });

  it("keeps the four canonical sources private and backfills idempotently", () => {
    const source = migration.slice(
      migration.indexOf("create view public.player_badge_award_sync_source"),
      migration.indexOf("create or replace function public.sync_player_badge_award_ledger"),
    );
    expect(source).toContain("public.player_badge_awards");
    expect(source).toContain("public.pre_p11_badge_awards");
    expect(source).toContain("public.event_lead_time_badge_awards");
    expect(source).toContain("public.bingo_line_diamond_badge_awards");
    expect(source).toContain("revoke all");
    const sync = functionBody("sync_player_badge_award_ledger",
      "create or replace function public.sync_all_player_badge_award_ledgers");
    expect(sync).toContain("on conflict (award_key) do update");
    expect(sync).toContain("is distinct from");
    expect(sync).toContain("delete from public.player_badge_award_ledger");
    expect(migration).toContain("select public.sync_all_player_badge_award_ledgers()");
  });

  it("makes profile and rarity reads ledger-only", () => {
    const profile = functionBody("get_player_visible_badges",
      "create or replace function public.get_badge_rarity");
    const rarity = functionBody("get_badge_rarity",
      "create or replace view public.player_badge_award_achievements");
    for (const body of [profile, rarity]) {
      expect(body).toContain("public.player_badge_award_ledger");
      expect(body).not.toMatch(/player_badge_awards|pre_p11_badge_awards|event_lead_time_badge_awards|bingo_line_diamond_badge_awards|qualified_official_times|player_statistics/);
    }
    expect(rarity).not.toContain("public_player_badges");
  });

  it("uses targeted insert refreshes and statement-level global correction refreshes", () => {
    expect(migration).toContain("referencing new table as new_attempts");
    expect(migration).toContain("for each statement execute function public.refresh_badge_ledger_after_attempt_insert()");
    expect(migration).toContain("attempts_update_refresh_badge_ledger");
    expect(migration).toContain("attempts_delete_refresh_badge_ledger");
    expect(migration).toContain("referencing old table as old_attempts new table as new_attempts");
    expect(migration).toMatch(/historical_attempts_refresh_badge_ledger[\s\S]*for each statement/);
    expect(migration).toContain("events_refresh_badge_ledger");
    expect(migration).toContain("event_participants_refresh_badge_ledger");
    expect(migration).toContain("badge_definitions_refresh_badge_ledger");
    expect(migration).not.toMatch(/statement_timeout/i);
  });
});
