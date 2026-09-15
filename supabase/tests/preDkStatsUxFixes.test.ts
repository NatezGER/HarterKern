import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const fix = readFileSync(fileURLToPath(new URL(
  "../migrations/202609150051_pre_dk_stats_ux_fixes.sql",
  import.meta.url,
)), "utf8");
const foundation = readFileSync(fileURLToPath(new URL(
  "../migrations/202608020017_pr8a_badges_trophies_most_wanted.sql",
  import.meta.url,
)), "utf8");

describe("Pre-DK stats and UX fixes", () => {
  it("excludes .00 from Trophy Schnapszahl stats with a guarded correction", () => {
    expect(fix).toContain("where ending between 11 and 99 and mod(ending, 11) = 0");
    expect(fix).toContain("if corrected_definition = original_definition then");
  });

  it("keeps Time Stopper as an active, separate badge definition", () => {
    expect(foundation).toContain("('time-stopper', 'performance', 'special', 'Zeitstopper'");
    expect(foundation).toContain("player_id, 'time-stopper'::text");
  });
});
