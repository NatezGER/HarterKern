import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202610050061_statistics_rivalry_hub.sql", "utf8");

describe("statistics rivalry hub migration", () => {
  it("projects all qualifying pairs through one season-scoped RPC", () => {
    expect(sql).toContain("create function public.get_rivalry_hub");
    expect(sql).toContain("p_include_pairs boolean default true");
    expect(sql).toContain("from public.event_pair_summaries");
    expect(sql).toContain("extract(year from summaries.event_date)::integer = p_season_year");
    expect(sql).toContain("rollup.rivalry_events > 0 or rollup.all_direct_takeovers > 0");
    expect(sql).not.toMatch(/for\s+.+loop/i);
  });

  it("does not alter the canonical rivalry threshold or migration 060", () => {
    expect(sql).not.toContain("direct_takeovers >= 3");
    expect(sql).not.toContain("create or replace view public.rivalry_pair_events");
  });
});
