import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/stats/MostWantedMatrix", () => ({
  MostWantedMatrix: () => <div>Existing Most Wanted</div>,
}));

import { TrophyEventSpecialStats } from "@/components/events/TrophyEventSpecialStats";
import type { TrophyEventSpecialStats as TrophyData } from "@/types/trophyEventStats";

const data: TrophyData = {
  eventId: "event-a", eventName: "Special",
  mostWanted: {
    endings: [], reached: 0, total: 100, percent: 0, openEndings: [],
    mostCommonEnding: null, mostCommonHits: 0, rarestAchievedEndings: [], topHunters: [],
  },
  metrics: {
    bingoLines: 0, distinctEndings: 0, snapEndings: 0,
    matchingTimeParticipantCount: 0, matchingTimeHundredths: null,
    matchingTimeParticipantNames: [], validAttempts: 0,
    mostCommonEnding: null, mostCommonEndingHits: 0,
  },
  dashboard: {
    scope: "special-event", metrics: [{
      key: "fastest", title: "Schnellste Zeit", description: "Event",
      format: "time", direction: "asc", minimumSample: 1, group: "performance",
      overallValue: 299, overallCount: null, overallTotal: null,
      overallDetail: null, rankings: [],
    }],
    rivalryPairs: [{
      playerLowId: "a", playerHighId: "b", playerLowName: "Paul",
      playerHighName: "Lars", rivalryEvents: 0,
      directTakeovers: 5, levelReached: true,
    }],
  },
};

describe("Trophy Event shared statistics", () => {
  it("shows event rankings and provisional rivalry watch alongside existing special data while live", () => {
    const markup = renderToStaticMarkup(<TrophyEventSpecialStats data={data} loading={false} error="" live />);
    expect(markup).toContain("data-metric-dashboard");
    expect(markup).toContain("Rivalry Watch");
    expect(markup).toContain("Existing Most Wanted");
    expect(markup).toContain("Event-Meilensteine");
  });

  it("keeps the same event metrics after close without a live-watch label", () => {
    const markup = renderToStaticMarkup(<TrophyEventSpecialStats data={data} loading={false} error="" />);
    expect(markup).toContain("data-metric-dashboard");
    expect(markup).not.toContain("Rivalry Watch");
  });
});
