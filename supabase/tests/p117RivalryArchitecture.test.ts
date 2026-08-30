import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../migrations/202608300042_p117_rivalry_events_badge.sql", import.meta.url), "utf8");

describe("P11.7 canonical rivalry architecture", () => {
  it("counts only strict record takeovers in closed events", () => {
    expect(sql).toContain("e.status = 'closed'");
    expect(sql).toContain("contextual.time_hundredths < contextual.prior_best");
    expect(sql).toContain("previous_player_id <> player_id");
    expect(sql).toContain("coalesce(switches.direct_takeovers, 0) >= 3");
  });
  it("canonicalizes pair direction and preserves third-player transitions", () => {
    expect(sql).toContain("least(previous_player_id, player_id)");
    expect(sql).toContain("greatest(previous_player_id, player_id)");
    expect(sql).toContain("count(distinct prior.player_id) = 1");
  });
  it("counts event-pair proofs rather than distinct real events", () => {
    expect(sql).toContain("partition by player_id order by closed_at, event_id, rival_player_id");
    expect(sql).toContain("'rivalPlayerId'");
    expect(sql).not.toContain("count(distinct events.event_id)");
  });
  it("defines 1/3/5/10 tiers and integrates the canonical ledger sync", () => {
    expect([...sql.matchAll(/'rivalry-(?:bronze|silver|gold|diamond)'/g)]).toHaveLength(4);
    for (const threshold of [1, 3, 5, 10]) expect(sql).toMatch(new RegExp(`, ${threshold}, 16`));
    expect(sql).toContain("union all select * from public.rivalry_badge_awards");
    expect(sql).toContain("sync_all_player_badge_award_ledgers");
  });
});
