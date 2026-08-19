import { describe, expect, it } from "vitest";
import { mostWantedProgressPercent } from "@/lib/mostWantedProgress";

describe("Most Wanted progress width", () => {
  it.each([
    [24, 100, 24],
    [51, 100, 51],
    [100, 100, 100],
    [0, 100, 0],
  ])("maps %i of %i to %i percent", (reached, total, expected) => {
    expect(mostWantedProgressPercent(reached, total)).toBe(expected);
  });

  it("clamps invalid display ranges", () => {
    expect(mostWantedProgressPercent(120, 100)).toBe(100);
    expect(mostWantedProgressPercent(-1, 100)).toBe(0);
    expect(mostWantedProgressPercent(1, 0)).toBe(0);
  });
});
