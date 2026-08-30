import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../migrations/202608300043_p117_event_badge_unlocks_ledger.sql", import.meta.url),
  "utf8",
);

describe("P11.7 event badge unlock ledger hotfix", () => {
  it("reads canonical event awards directly from the persisted ledger", () => {
    expect(sql).toContain("create or replace view public.event_badge_unlocks");
    expect(sql).toContain("from public.player_badge_award_ledger ledger");
    expect(sql).toContain("events.id = ledger.source_event_id");
    expect(sql).toContain("player_badge_award_ledger_event_idx");
    expect(sql).not.toContain("public.public_player_badges");
    expect(sql).not.toContain("public.badge_rarity_statistics");
  });

  it("preserves generic source metadata required by normal and rivalry awards", () => {
    expect(sql).toContain("ledger.source_type");
    expect(sql).toContain("ledger.source_attempt_id");
    expect(sql).toContain("ledger.source_event_id");
    expect(sql).toContain("ledger.metadata");
    expect(sql).toContain("ledger.source_attempt_number");
    expect(sql).toContain("ledger.source_time_hundredths");
  });
});
