import { describe, expect, it } from "vitest";
import {
  beerLitersForAttempts,
  countBeerEligibleEventAttempts,
  resolveBeerVolumeMilestone,
} from "@/lib/beerVolume";

describe("beer volume", () => {
  it("converts every valid official attempt into 0.2 liters", () => {
    expect(beerLitersForAttempts(1)).toBe(0.2);
    expect(beerLitersForAttempts(687)).toBeCloseTo(137.4);
  });

  it("excludes DNF, AK, guests and attempts without a valid time", () => {
    expect(countBeerEligibleEventAttempts([
      { isGuest: false, isAk: false, isDnf: false, timeHundredths: 300 },
      { isGuest: false, isAk: false, isDnf: true, timeHundredths: null },
      { isGuest: false, isAk: true, isDnf: false, timeHundredths: 310 },
      { isGuest: true, isAk: false, isDnf: false, timeHundredths: 320 },
      { isGuest: false, isAk: false, isDnf: false, timeHundredths: null },
    ])).toBe(1);
  });

  it("resolves milestones below, exactly on and above a threshold", () => {
    expect(resolveBeerVolumeMilestone(49).next?.liters).toBe(10);
    expect(resolveBeerVolumeMilestone(50).reached?.liters).toBe(10);
    expect(resolveBeerVolumeMilestone(51).next?.liters).toBe(12);
    expect(resolveBeerVolumeMilestone(687).progress).toBeCloseTo(37);
  });

  it("uses the final catalogue goal without inventing another target", () => {
    const end = resolveBeerVolumeMilestone(5_000_000);
    expect(end.liters).toBe(1_000_000);
    expect(end.reached?.liters).toBe(219000);
    expect(end.next).toBeNull();
    expect(end.progress).toBe(100);
    expect(resolveBeerVolumeMilestone(6_000_000).next).toBeNull();
  });

  it("uses the same deterministic conversion for All-Time, season and event counts", () => {
    expect([100, 40, 5].map(beerLitersForAttempts)).toEqual([20, 8, 1]);
  });
});
