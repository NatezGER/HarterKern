import { describe, expect, it } from "vitest";
import { beerMilestones, teamMilestones, teamTimeMilestones } from "@/constants/teamMilestones";
import { resolveMilestoneProgress as resolve } from "./teamMilestoneProgress";
import { resolveTeamMilestones } from "./teamMilestones";
const beer = (currentValue: number) => resolve({ definitions: beerMilestones, currentValue, direction: "up" });
const time = (currentValue: number) => resolve({ definitions: teamTimeMilestones, currentValue, direction: "down" });
describe("central team milestone catalogue and progression", () => {
  it("contains every requested step with unique IDs, thresholds and artwork slots", () => {
    expect(beerMilestones).toHaveLength(46); expect(teamTimeMilestones).toHaveLength(25);
    expect(new Set(teamMilestones.map(m=>m.id)).size).toBe(71);
    expect(new Set(teamMilestones.map(m=>m.assetKey)).size).toBe(71);
    for (const list of [beerMilestones,teamTimeMilestones]) {
      expect(new Set(list.map(m=>m.threshold)).size).toBe(list.length);
      for (const m of list) { expect(m.assetKey).toMatch(/^[a-z0-9-]+$/); if (m.interestingFact) expect(m.source?.url).toMatch(/^https:\/\//); }
    }
    expect(beerMilestones.find(m=>m.id==="beer-chocolate")?.threshold).toBe(17000);
    expect(beerMilestones.find(m=>m.id==="beer-dixi-cabin")?.title).toContain("hypothetischer");
    expect(teamTimeMilestones.find(m=>m.id==="team-minesweeper-26-59")?.threshold).toBe(26.59);
    expect(beerMilestones.find(m=>m.id==="beer-keyes-20-4")?.title).toContain("Jack Keyes");
  });
  it("handles beer before/exactly/between/after milestones and uses the current interval", () => {
    expect(beer(0.2).achievedMilestone).toBeNull(); expect(beer(0.2).progress).toBeCloseTo(.4);
    expect(beer(.5).achievedMilestone?.threshold).toBe(.5); expect(beer(.5).progress).toBe(0);
    expect(beer(52.4).achievedMilestone?.threshold).toBe(51.1);
    expect(beer(52.4).nextMilestone?.threshold).toBe(60);
    expect(beer(52.4).progress).toBeCloseTo(1.3/8.9);
    expect(beer(52.4).remaining).toBe(7.6);
    expect(beer(300000).complete).toBe(true); expect(beer(300000).nextMilestone).toBeNull();
  });
  it("handles time above/exactly/between/below thresholds", () => {
    expect(time(50).achievedMilestone).toBeNull(); expect(time(50).progress).toBe(0);
    expect(time(50).nextMilestone?.threshold).toBe(47);
    expect(time(47).achievedMilestone?.threshold).toBe(47); expect(time(47).progress).toBe(0);
    expect(time(26.1).achievedMilestone?.threshold).toBe(26.59);
    expect(time(26.1).nextMilestone?.threshold).toBe(25.96);
    expect(time(26.1).progress).toBeCloseTo(.49/.63);
    expect(Math.round(time(26.1).progress*100)).toBe(78); expect(time(26.1).remaining).toBe(.14);
    expect(time(26.05).progress).toBeGreaterThan(time(26.1).progress);
    expect(time(18).complete).toBe(true); expect(time(18).progress).toBe(1);
  });
  it("sorts numerically without mutating source order in both directions", () => {
    const definitions = [{ threshold: 60 },{ threshold: 1 },{ threshold: 10 }];
    expect(resolve({ definitions, currentValue: 11, direction:"up" }).achievedMilestone?.threshold).toBe(10);
    expect(resolve({ definitions, currentValue: 11, direction:"down" }).nextMilestone?.threshold).toBe(10);
    expect(definitions.map(m=>m.threshold)).toEqual([60,1,10]);
  });
  it("has no fake completions for missing values, empty catalogues or incomplete teams", () => {
    expect(resolve({ definitions:[],currentValue:1,direction:"up" }).complete).toBe(false);
    for (const value of [null,NaN,Infinity,-1]) expect(resolve({ definitions:beerMilestones,currentValue:value,direction:"up" }).achievedMilestones).toEqual([]);
    for (const playerCount of [0,2,9]) {
      const result = resolveTeamMilestones({ season:2026,validAttempts:262,teamTimeHundredths:500,playerCount });
      expect(result.time.achievedMilestones).toEqual([]); expect(result.qualified).toBe(false);
      expect(result.beer.achievedMilestone?.threshold).toBe(51.1);
    }
    expect(resolveTeamMilestones({ season:2026,validAttempts:0,teamTimeHundredths:2610,playerCount:10 }).time.remaining).toBe(.14);
  });
});
