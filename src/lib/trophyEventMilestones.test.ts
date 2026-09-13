import { describe, expect, it } from "vitest";
import { buildTrophyEventMilestones } from "@/lib/trophyEventMilestones";
import type { TrophyEventSpecialMetrics } from "@/types/trophyEventStats";

const metrics = (changes: Partial<TrophyEventSpecialMetrics> = {}): TrophyEventSpecialMetrics => ({
  bingoLines: 0,
  distinctEndings: 0,
  snapEndings: 0,
  matchingTimeParticipantCount: 0,
  matchingTimeHundredths: null,
  matchingTimeParticipantNames: [],
  validAttempts: 0,
  mostCommonEnding: null,
  mostCommonEndingHits: 0,
  ...changes,
});

describe("Trophy event milestones", () => {
  it.each([
    [9, []], [10, [10]], [25, [10, 25]], [50, [10, 25, 50]],
    [75, [10, 25, 50, 75]], [100, [10, 25, 50, 75, 100]],
  ])("evaluates Most Wanted at %i endings", (count, achieved) => {
    const family = buildTrophyEventMilestones(metrics({ distinctEndings: count }))[1];
    expect(family.stages.filter((stage) => stage.achieved).map(({ threshold }) => threshold))
      .toEqual(achieved);
  });

  it("uses the canonical line count and all ten snap endings", () => {
    const open = buildTrophyEventMilestones(metrics({ bingoLines: 0, snapEndings: 9 }));
    expect(open[0].stages[0].achieved).toBe(false);
    expect(open[2].stages[0].achieved).toBe(false);
    const achieved = buildTrophyEventMilestones(metrics({ bingoLines: 1, snapEndings: 10 }));
    expect(achieved[0].stages[0].achieved).toBe(true);
    expect(achieved[2].stages[0].achieved).toBe(true);
  });

  it.each([[1, []], [2, [2]], [3, [2, 3]], [5, [2, 3, 5]]])(
    "counts %i distinct participants sharing an exact time",
    (count, achieved) => {
      const family = buildTrophyEventMilestones(metrics({
        matchingTimeParticipantCount: count,
        matchingTimeHundredths: 342,
        matchingTimeParticipantNames: ["Paul", "Fipsi"],
      }))[3];
      expect(family.stages.filter((stage) => stage.achieved).map(({ threshold }) => threshold))
        .toEqual(achieved);
      expect(family.detail).toContain("3,42 s");
    },
  );

  it.each([[49, []], [50, [50]], [99, [50]], [100, [50, 100]],
    [199, [50, 100]], [200, [50, 100, 200]]])(
    "evaluates %i valid attempts",
    (count, achieved) => {
      const family = buildTrophyEventMilestones(metrics({ validAttempts: count }))[4];
      expect(family.stages.filter((stage) => stage.achieved).map(({ threshold }) => threshold))
        .toEqual(achieved);
    },
  );

  it.each([[1, []], [2, [2]], [3, [2, 3]], [5, [2, 3, 5]], [10, [2, 3, 5, 10]]])(
    "evaluates an ending hit %i times",
    (count, achieved) => {
      const family = buildTrophyEventMilestones(metrics({
        mostCommonEnding: 42,
        mostCommonEndingHits: count,
      }))[5];
      expect(family.stages.filter((stage) => stage.achieved).map(({ threshold }) => threshold))
        .toEqual(achieved);
      expect(family.detail).toBe(`.42 · ${count} Treffer`);
    },
  );
});
