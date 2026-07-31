import { describe, expect, it } from "vitest";
import { buildProgressionCoordinates, buildStepPath, formatRecordDuration } from "@/lib/progression";

describe("progression chart", () => {
  it("keeps equal timestamps deterministic without inventing times", () => {
    const points = buildProgressionCoordinates([
      { id: "b", achievedAt: "2025-01-01", timeHundredths: 400 },
      { id: "a", achievedAt: "2025-01-01", timeHundredths: 500 },
    ]);
    expect(points.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(points.map(({ achievedAt }) => achievedAt)).toEqual(["2025-01-01", "2025-01-01"]);
  });

  it("draws faster records lower as an angular step path", () => {
    const points = buildProgressionCoordinates([
      { id: "a", achievedAt: "2025-01-01", timeHundredths: 500 },
      { id: "b", achievedAt: "2025-02-01", timeHundredths: 300 },
    ]);
    expect(points[1].y).toBeGreaterThan(points[0].y);
    expect(buildStepPath(points)).toContain(" H ");
    expect(buildStepPath(points)).toContain(" V ");
  });

  it("gives a single point a useful centered position", () => {
    expect(buildProgressionCoordinates([
      { id: "only", achievedAt: "2025-01-01", timeHundredths: 300 },
    ])[0]).toMatchObject({ x: 50, y: 50 });
    expect(formatRecordDuration(1)).toBe("1 Tag");
  });
});
