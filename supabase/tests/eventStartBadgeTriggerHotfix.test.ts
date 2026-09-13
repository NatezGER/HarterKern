import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL(
  "../migrations/202609130046_event_start_badge_trigger_hotfix.sql",
  import.meta.url,
), "utf8");

describe("event start badge trigger hotfix", () => {
  it("skips ledger expansion only for participant inserts into active events", () => {
    expect(sql).toContain("tg_op = 'INSERT'");
    expect(sql).toContain("events.id = new.event_id");
    expect(sql).toContain("events.status = 'active'");
    expect(sql).toContain("return new;");
  });

  it("retains the existing targeted synchronization for other mutations", () => {
    expect(sql).toContain("public.sync_player_badge_award_ledger(requested_player_id)");
    expect(sql).toContain("tg_op in ('DELETE', 'UPDATE')");
    expect(sql).not.toContain("sync_all_player_badge_award_ledgers");
    expect(sql).not.toMatch(/disable trigger|drop trigger/i);
  });
});
