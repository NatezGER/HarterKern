import { describe, expect, it } from "vitest";
import { scaleAttemptNumberBars } from "@/lib/attemptNumberChart";
import type { AttemptNumberPoint } from "@/types/historyProfiles";

const point = (
  attemptNumber: number,
  averageHundredths: number | null,
): AttemptNumberPoint => ({
  attemptNumber,
  averageHundredths,
  samples: 3,
  validAttempts: averageHundredths == null ? 0 : 3,
  dnfCount: averageHundredths == null ? 3 : 0,
});

describe("attempt-number chart scaling", () => {
  it("renders faster averages visibly higher than slower averages", () => {
    const bars = scaleAttemptNumberBars([
      point(1, 400),
      point(2, 300),
      point(3, 200),
    ]);
    expect(bars.map(({ heightPercent }) => heightPercent))
      .toEqual([35, 67.5, 100]);
  });

  it("uses a meaningful height for one value or equal values", () => {
    expect(scaleAttemptNumberBars([point(1, 250)])[0].heightPercent).toBe(70);
    expect(scaleAttemptNumberBars([point(1, 250), point(2, 250)])
      .map(({ heightPercent }) => heightPercent)).toEqual([70, 70]);
  });

  it("keeps gaps absent and renders missing averages minimally", () => {
    const bars = scaleAttemptNumberBars([
      point(1, 300),
      point(3, null),
      point(5, 200),
    ]);
    expect(bars.map(({ attemptNumber }) => attemptNumber)).toEqual([1, 3, 5]);
    expect(bars[1].heightPercent).toBe(8);
    expect(bars[2].heightPercent).toBeGreaterThan(bars[0].heightPercent);
  });
});
