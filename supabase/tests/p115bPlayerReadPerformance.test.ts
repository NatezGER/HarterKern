import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL(
  "../migrations/202608270035_p115b_player_read_performance.sql",
  import.meta.url,
)), "utf8");

describe("P11.5 B player read performance migration", () => {
  it("filters the four canonical badge sources before enrichment", () => {
    const requested = migration.slice(
      migration.indexOf("with requested_awards"),
      migration.indexOf("), enriched as"),
    );
    expect(requested.match(/player_id = p_player_id/g)).toHaveLength(4);
    expect(requested).toContain("public.player_badge_awards");
    expect(requested).toContain("public.pre_p11_badge_awards");
    expect(requested).toContain("public.event_lead_time_badge_awards");
    expect(requested).toContain("public.bingo_line_diamond_badge_awards");
    expect(migration).not.toMatch(/from public\.visible_player_badges visible/);
  });

  it("uses player-scoped trophy and BINGO predicates", () => {
    expect(migration).toContain("where ep.player_id = p_player_id");
    expect(migration).toContain("where h.player_id = p_player_id");
    expect(migration).toContain("create or replace function public.get_player_bingo");
    expect(migration).toContain("public.player_bingo_fields");
    expect(migration).toContain("public.player_bingo_statistics");
    expect(migration).not.toContain("minimum_hit_count >=");
  });

  it("keeps timeout settings unchanged and adds only targeted read indexes", () => {
    expect(migration).not.toMatch(/statement_timeout/i);
    expect(migration).toContain("attempts_player_profile_read_idx");
    expect(migration).toContain("historical_attempts_player_profile_read_idx");
  });
});
