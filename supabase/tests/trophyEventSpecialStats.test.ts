import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL(
  "../migrations/202609130049_trophy_event_special_stats.sql",
  import.meta.url,
), "utf8");

describe("Trophy event special-stat read model", () => {
  it("is one stable security-invoker RPC gated by Trophy Event metadata", () => {
    expect(sql).toContain("get_trophy_event_special_stats(p_event_id uuid)");
    expect(sql).toContain("stable");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("e.id = p_event_id");
    expect(sql).toContain("e.awards_trophies");
    expect(sql).toContain("a.event_id = event.id");
  });

  it("matches canonical attempt qualification and deterministic first-hit ordering", () => {
    expect(sql).toContain("a.status = 'approved'");
    expect(sql).toContain("a.deleted_at is null");
    expect(sql).toContain("not visible.is_dnf");
    expect(sql).toContain("not visible.is_ak");
    expect(sql).toContain("not p.is_archived");
    expect(sql).toContain("order by occurred_at, source_order, source_id");
    expect(sql).toContain("count(distinct participant_key)");
  });

  it("derives Bingo and all milestone metrics without touching lifecycle writes", () => {
    expect(sql).toContain("public.bingo_line_cells");
    expect(sql).toContain("having count(*) = 10");
    expect(sql).toContain("mod(ending, 11) = 0");
    expect(sql).toContain("matching_time_participants");
    expect(sql).toContain("mostCommonEndingHits");
    expect(sql).not.toMatch(/create\s+trigger/i);
    expect(sql).not.toContain("sync_player_badge_awards");
    expect(sql).not.toContain("sync_start_event");
    expect(sql).not.toContain("sync_close_event");
  });
});
