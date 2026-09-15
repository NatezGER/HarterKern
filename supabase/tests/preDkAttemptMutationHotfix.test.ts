import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL(
  "../migrations/202609150052_attempt_mutation_badge_hotfix.sql",
  import.meta.url,
), "utf8");

function section(start: string, end: string) {
  const startIndex = sql.indexOf(start);
  return sql.slice(startIndex, sql.indexOf(end, startIndex));
}

describe("Pre-DK attempt mutation hotfix", () => {
  it("uses transition aliases that cannot collide with PL/pgSQL OLD/NEW", () => {
    expect(sql).toContain("old_attempts as previous_rows");
    expect(sql).toContain("new_attempts as current_rows");
    expect(sql).toContain("old_attempts as deleted_rows");
    expect(sql).not.toMatch(/old_attempts\s+(?:as\s+)?old\b/i);
    expect(sql).not.toMatch(/new_attempts\s+(?:as\s+)?new\b/i);
    expect(sql).not.toMatch(/\bold\.event_id\b/i);
    expect(sql).not.toMatch(/\bnew\.event_id\b/i);
  });

  it("refreshes Matrix evidence for only the old/new affected events", () => {
    const matrixUpdate = section(
      "create or replace function public.refresh_matrix_glitch_after_attempt_update",
      "create or replace function public.refresh_matrix_glitch_after_attempt_delete",
    );
    const matrixDelete = section(
      "create or replace function public.refresh_matrix_glitch_after_attempt_delete",
      "create or replace function public.refresh_badge_ledger_after_attempt_update",
    );
    expect(matrixUpdate).toContain("previous_rows.event_id");
    expect(matrixUpdate).toContain("current_rows.event_id");
    expect(matrixUpdate).toContain("refresh_matrix_glitch_event_evidence(requested_event_id)");
    expect(matrixDelete).toContain("deleted_rows.event_id");
    expect(matrixDelete).toContain("refresh_matrix_glitch_event_evidence(requested_event_id)");
  });

  it("batch-syncs only players belonging to affected event sequences", () => {
    const update = section(
      "create or replace function public.refresh_badge_ledger_after_attempt_update",
      "create or replace function public.refresh_badge_ledger_after_attempt_delete_scoped",
    );
    const deletion = section(
      "create or replace function public.refresh_badge_ledger_after_attempt_delete_scoped",
      "revoke all on function",
    );
    for (const mutation of [update, deletion]) {
      expect(mutation).toContain("array_agg(affected.player_id");
      expect(mutation).toContain("sync_player_badge_award_ledgers(requested_player_ids)");
      expect(mutation).not.toContain("sync_all_player_badge_award_ledgers");
    }
    expect(update).toContain("previous_rows.player_id");
    expect(update).toContain("current_rows.player_id");
    expect(deletion).toContain("deleted_rows.player_id");
  });

  it("replaces only the DELETE ledger trigger and keeps its transition table", () => {
    expect(sql).toContain("drop trigger if exists attempts_delete_refresh_badge_ledger");
    expect(sql).toContain("referencing old table as old_attempts");
    expect(sql).toContain("refresh_badge_ledger_after_attempt_delete_scoped()");
    expect(sql).not.toContain("attempts_insert_refresh_badge_ledger");
    expect(sql).not.toContain("get_live_attempt_badge_unlocks");
    expect(sql).not.toContain("refresh_badge_ledger_after_event_change");
  });
});
