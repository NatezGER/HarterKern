import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../migrations/202608300041_p116_ranking_badge_statistics.sql", import.meta.url), "utf8");

describe("P11.6 badge statistics migration", () => {
  it("deduplicates progressive ledger awards per family and counts cumulatively", () => {
    expect(sql).toContain("group by ledger.player_id, definitions.family_key");
    expect(sql).toContain("count(*) filter (where tier_rank >= 1)");
    expect(sql).toContain("count(*) filter (where tier_rank >= 4)");
  });
  it("counts emerald separately and never promotes consolation", () => {
    expect(sql).toContain("design_variant = 'positive_special'");
    expect(sql).toContain("design_variant = 'standard'");
    expect(sql).not.toMatch(/consolation[^\n]*count/i);
  });
  it("gets batched current progress from the canonical full sync source", () => {
    expect(sql).toContain("player_badge_award_sync_source");
    expect(sql).toContain("partition by player_id, family_key");
  });
});
