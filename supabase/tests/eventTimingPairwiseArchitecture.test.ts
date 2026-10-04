import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202610040060_event_timing_pairwise_rivalries.sql", "utf8");
const deepCompare = readFileSync("src/lib/playerCompareDeep.ts", "utf8");
const compareService = readFileSync("src/services/playerCompareService.ts", "utf8");

describe("migration 060 canonical timing and pairwise rivalry", () => {
  it("centralizes official attempts and overlap-safe active elapsed seconds", () => {
    const officialAttemptView = migration.match(
      /create or replace view public\.official_event_attempts[\s\S]*?;/,
    )?.[0] ?? "";
    const officialAttemptFilter = officialAttemptView.slice(officialAttemptView.indexOf("\nwhere "));

    expect(migration).toContain("create or replace view public.official_event_attempts");
    expect(migration).toContain("create or replace function public.event_active_elapsed_seconds");
    expect(migration).toContain("max(interval_end)");
    expect(migration).toContain("a.status = 'approved'");
    expect(officialAttemptView).toContain("(not a.is_dnf and a.time_hundredths is not null) is_valid_time");
    expect(officialAttemptFilter).not.toContain("not a.is_dnf");
  });

  it("uses pair-local PB state rather than the global event best", () => {
    expect(migration).toContain("event_pair_attempt_states");
    expect(migration).toContain("partition by pairs.event_id, pairs.player_low_id, pairs.player_high_id");
    expect(migration).toContain("previous_leader_player_id");
    expect(migration).not.toMatch(/prior_event_best[\s\S]{0,1000}event_direct_lead_takeovers/);
  });

  it("keeps badge reconciliation scoped", () => {
    expect(migration).toContain("sync_player_badge_award_ledgers(affected_player_ids)");
    expect(migration).not.toContain("sync_all_player_badge_award_ledgers");
  });

  it("removes the client-side rivalry engine and maps canonical RPC values", () => {
    expect(deepCompare).not.toContain("calculateDirectRivalry");
    expect(compareService).toContain("player_a_lead_seconds");
    expect(compareService).toContain("player_a_takeovers");
  });
});
