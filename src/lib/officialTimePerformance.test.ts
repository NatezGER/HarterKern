import { describe, expect, it } from "vitest";
import {
  calculateAttemptNumberPerformance,
  calculateTimeThresholds,
  dnfPercentage,
} from "@/lib/officialTimePerformance";

describe("official time performance", () => {
  it("calculates cumulative under-5, under-4 and under-3 shares", () => {
    const result = calculateTimeThresholds([
      { timeHundredths: 280 },
      { timeHundredths: 350 },
      { timeHundredths: 450 },
    ]);
    expect(result.map(({ seconds, count, total }) => ({ seconds, count, total }))).toEqual([
      { seconds: 5, count: 3, total: 3 },
      { seconds: 4, count: 2, total: 3 },
      { seconds: 3, count: 1, total: 3 },
    ]);
  });

  it("keeps DNF outside the valid-time denominator", () => {
    expect(calculateTimeThresholds([{ timeHundredths: 280 }])[0]).toMatchObject({ count: 1, total: 1, percent: 100 });
    expect(dnfPercentage(14, 1)).toBe(6.7);
    expect(dnfPercentage(0, 0)).toBe(0);
  });

  it("groups only event times by attempt number with sample counts", () => {
    const result = calculateAttemptNumberPerformance([
      { timeHundredths: 300, sourceType: "attempt", sourceOrder: 1 },
      { timeHundredths: 340, sourceType: "attempt", sourceOrder: 1 },
      { timeHundredths: 280, sourceType: "attempt", sourceOrder: 2 },
      { timeHundredths: 200, sourceType: "historical_attempt", sourceOrder: 1 },
    ]);
    expect(result).toEqual([
      { attemptNumber: 1, samples: 2, validAttempts: 2, dnfCount: 0, averageHundredths: 320 },
      { attemptNumber: 2, samples: 1, validAttempts: 1, dnfCount: 0, averageHundredths: 280 },
    ]);
  });
});
