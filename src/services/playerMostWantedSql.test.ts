import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202608300040_p115_compare_finish.sql", "utf8");
const pgTap = readFileSync("supabase/tests/database/p115_compare_finish.sql", "utf8");

describe("Most Wanted player projection migration", () => {
  it("deduplicates all-time endings through the canonical qualified source", () => {
    expect(sql).toContain("count(distinct mod(q.time_hundredths, 100))");
    expect(sql).toContain("from public.qualified_official_times q");
  });

  it("reuses deterministic seasonal first-hit results without rebuilding ranking rules", () => {
    expect(sql).toContain("from public.season_most_wanted_endings mw");
    expect(sql).toContain("mw.season_year = p_season_year");
    expect(sql).toContain("mw.first_player_id");
    expect(sql).not.toContain("row_number()");
  });

  it("ships pgTAP coverage for deduplication, season isolation and pair scope", () => {
    expect(pgTap).toContain("duplicate ending and invalid DNF");
    expect(pgTap).toContain("changing season does not leak");
    expect(pgTap).toContain("pair-scoped call");
  });
});
