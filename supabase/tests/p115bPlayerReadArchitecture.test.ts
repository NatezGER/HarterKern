import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL(
  "../migrations/202608280036_p115b_player_read_architecture.sql",
  import.meta.url,
)), "utf8");

function functionBody(name: string, nextName: string) {
  return migration.slice(migration.indexOf(`function public.${name}`),
    migration.indexOf(`function public.${nextName}`));
}

describe("P11.5 B player read architecture migration", () => {
  it("keeps the gallery badge RPC slim and filters every award source", () => {
    const badges = functionBody("get_player_visible_badges", "get_player_bingo");
    expect(badges.match(/player_id = p_player_id/g)).toHaveLength(4);
    expect(badges).toContain("public.bingo_line_diamond_badge_awards");
    expect(badges).not.toMatch(/rarity|recipient_count|regular_player_count/i);
    expect(badges).not.toMatch(/next_badge|current_progress|player_statistics/i);
    expect(badges).not.toContain("public.visible_player_badges");
  });

  it("starts qualified-time and extended reads at the selected player", () => {
    const times = functionBody("get_player_qualified_times",
      "get_player_attempt_number_statistics");
    const attempts = functionBody("get_player_attempt_number_statistics",
      "get_player_event_history");
    expect(times.match(/player_id = p_player_id/g)?.length).toBeGreaterThanOrEqual(2);
    expect(times).not.toContain("qualified_official_times");
    expect(attempts).toContain("attempts.player_id = p_player_id");
    expect(attempts).not.toContain("from public.player_attempt_number_statistics");
    expect(migration.slice(migration.indexOf("function public.get_player_event_history")))
      .toContain("participants.player_id = p_player_id");
  });

  it("shares canonical BINGO definitions and scans the selected player's hits once", () => {
    const bingo = functionBody("get_player_bingo", "get_player_qualified_times");
    expect(bingo).toContain("where hits.player_id = p_player_id");
    expect(bingo).toContain("family_key = 'bingo'");
    expect(bingo).toContain("public.bingo_line_cells");
    expect(bingo.match(/public\.player_bingo_hits/g)).toHaveLength(1);
    expect(bingo).not.toContain("public.player_bingo_fields");
    expect(bingo).not.toContain("public.player_bingo_statistics");
    expect(migration).not.toMatch(/favorite-time|statement_timeout/i);
    expect(migration).not.toMatch(/create\s+index/i);
  });
});
