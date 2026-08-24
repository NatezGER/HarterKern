import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeepCompareSections } from "@/components/compare/DeepCompareSections";
import type { Player } from "@/types";
import type { PlayerDeepCompareData } from "@/types/playerCompare";

const player = (id: string, name: string): Player => ({
  id, name, initials: name[0], avatarGradient: "", avatarUrl: null,
  personalBest: 2.5, average: 3, attempts: 10, validAttempts: 9, dnfCount: 1,
  dailyWins: 0, trend: "same", isAk: false, isArchived: false,
});

const deep = (offset: number): PlayerDeepCompareData => ({
  statistics: {
    consistency: {
      medianHundredths: 290 + offset, standardDeviationHundredths: 10 + offset,
      rangeHundredths: 50 + offset, fastestThreeAverageHundredths: 270 + offset,
      fastestFiveAverageHundredths: 280 + offset, pbToAverageHundredths: 40 + offset,
      pbToMedianHundredths: 30 + offset, sub3: { longest: 4, current: 2 },
      sub4: { longest: 8, current: 5 }, noDnf: { longest: 9, current: 6 },
    },
    eventDominance: {
      fastestFirstAttemptHundredths: 280 + offset, bestEventAverageHundredths: 290 + offset,
      eventsWithSub3: 3, eventsWithoutDnf: 2, perfectSub3Events: 1, eventsWithAttempts: 4,
    },
    attemptNumbers: Array.from({ length: 6 }, (_, index) => ({
      attemptNumber: index + 1, samples: 2, validAttempts: 2, dnfCount: 0,
      averageHundredths: 300 + offset + index,
    })),
    madness: {
      modalTimeHundredths: 299 + offset, modalTimeHits: 2, exactRepeatCount: 1,
      withinQuarterSecondOfPbPercent: 20, withinHalfSecondOfPbPercent: 40,
      distinctSub3Times: 5, mostCommonHundredth: 99, mostCommonHundredthHits: 2,
    },
  },
  progression: { personal: [], worldRecords: [] },
  badges: [],
  prestige: {
    pbCount: 2, largestPbImprovementHundredths: 30, averagePbImprovementHundredths: 15,
    worldRecordCount: 1, worldRecordDays: 4, longestWorldRecordDays: 4, visibleBadgeCount: 0,
  },
});

const stats = {
  personalBestHundredths: 250, rank: 1, averageHundredths: 300,
  eventParticipations: 5, wins: 2, secondPlaces: 1, thirdPlaces: 1,
  validAttempts: 9, dnfCount: 1, eventLeadSeconds: 120, eventBestBreaks: 2,
};

describe("DeepCompareSections", () => {
  it("renders the grouped deep sections and keeps career-only values labelled in season mode", () => {
    const markup = renderToStaticMarkup(<DeepCompareSections
      playerA={player("a", "Anna")}
      playerB={player("b", "Berta")}
      data={{ playerA: deep(0), playerB: deep(10) }}
      loading={false}
      error=""
      statsA={stats}
      statsB={{ ...stats, wins: 1 }}
      isAllTime={false}
    />);
    expect(markup).toContain("Konstanz &amp; Serien");
    expect(markup).toContain("Event-Dominanz");
    expect(markup).toContain("Nach Versuchsnummer");
    expect(markup).toContain("Weitere Versuche anzeigen");
    expect(markup).toContain("PB-Progression");
    expect(markup).toContain("Badge Battle");
    expect(markup).toContain("Prestige &amp; Records");
    expect(markup).toContain("Stat Madness");
    expect(markup).toContain("Karriere / All-Time");
    expect(markup).toContain("Experimentelle Übersicht");
  });
});
