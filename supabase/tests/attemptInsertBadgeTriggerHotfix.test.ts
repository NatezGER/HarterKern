import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL(
  "../migrations/202609130047_attempt_insert_badge_trigger_hotfix.sql",
  import.meta.url,
), "utf8");

describe("active-event attempt trigger hotfix", () => {
  it("excludes active-event inserts from synchronous ledger refresh", () => {
    expect(sql).toContain("from new_attempts inserted");
    expect(sql).toContain("events.status <> 'active'");
    expect(sql).toContain("inserted.event_id is null");
  });

  it("retains targeted refreshes for standalone and finalized corrections", () => {
    expect(sql).toContain("public.sync_player_badge_award_ledger(requested_player_id)");
    expect(sql).toContain("attempts.id in");
    expect(sql).toContain("attempts.event_id in");
    expect(sql).not.toContain("sync_all_player_badge_award_ledgers");
    expect(sql).not.toMatch(/drop trigger|disable trigger/i);
  });
});
