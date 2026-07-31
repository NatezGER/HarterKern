import { describe, expect, it } from "vitest";
import { calculateMilestoneProgress } from "@/lib/milestoneProgress";

describe("milestone progress", () => {
  it.each([[19, 100, 19], [0, 100, 0], [100, 100, 100], [140, 100, 100]])("maps %s/%s to %s percent", (current, target, expected) => {
    expect(calculateMilestoneProgress(current, target)).toBe(expected);
  });
});
