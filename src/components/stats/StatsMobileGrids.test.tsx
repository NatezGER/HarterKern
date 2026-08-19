import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useEffectivePublicData", () => ({ useEffectivePublicData: () => ({ data: { milestones: [{
  key: "one", threshold: 100, name: "Hundert", description: "Hundert Zeiten",
  currentCount: 50, achieved: false, achievedAt: null, playerId: null,
  playerName: null, eventId: null, eventName: null,
}] } }) }));

import { GroupMilestones } from "@/components/stats/GroupMilestones";
import { LeagueTimeStatistics } from "@/components/stats/LeagueTimeStatistics";
import { OfficialTimeThresholds } from "@/components/stats/OfficialTimePerformance";

describe("statistics mobile grids", () => {
  it("renders league milestones in two columns without span exceptions", () => {
    const markup = renderToStaticMarkup(<GroupMilestones />);
    expect(markup).toContain("grid-cols-2");
    expect(markup).not.toContain("col-span-2");
  });

  it("renders league statistic cards in two columns without span exceptions", () => {
    const markup = renderToStaticMarkup(<LeagueTimeStatistics data={{
      totalValidTimes: 10, mostCommonTimeHundredths: 400, mostCommonTimeHits: 2,
      mostCommonTimeParticipants: 2, smoothTimeCount: 3, mostCommonSmoothHundredths: 400,
      mostCommonSmoothHits: 2, topSmoothPlayerId: null, topSmoothPlayerName: null,
      topSmoothPlayerAvatarUrl: null, topSmoothPlayerHits: 0, latestSmoothPlayerName: null,
      latestSmoothHundredths: null, latestSmoothAt: null, latestSmoothDate: null,
      latestSmoothHasExactTime: false, thresholds: [],
    }} />);
    expect(markup).toContain("grid-cols-2");
    expect(markup).not.toContain("col-span-2");
  });

  it("keeps the three time thresholds in a two-column mobile grid", () => {
    const data = {
      reached: 0, total: 100, percent: 0, openEndings: [], mostCommonEnding: null,
      mostCommonHits: 0, rarestAchievedEndings: [], topHunters: [], endings: [],
      officialTimes: [],
    };
    const markup = renderToStaticMarkup(<OfficialTimeThresholds data={data} />);
    expect(markup).toContain("grid-cols-2");
    expect(markup).not.toContain("col-span-2");
  });
});
