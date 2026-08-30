import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync(new URL("../migrations/202608300044_p118_multi_player_progressions.sql", import.meta.url), "utf8");
describe("P11.8 batched progression read", () => {
  it("projects canonical all-time and season sources in one scoped RPC", () => {
    expect(sql).toContain("history.player_id = any(p_player_ids)");
    expect(sql).toContain("get_player_season_pb_history(requested.player_id, p_season_year)");
    expect(sql).toContain("p_season_year is null");
    expect(sql).toContain("p_season_year is not null");
    expect(sql).not.toContain("public.attempts");
  });
});
