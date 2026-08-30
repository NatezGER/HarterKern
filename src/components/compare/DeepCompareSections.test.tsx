import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CompareAttemptNumbersSection,
  CompareConsistencySection,
  CompareEventPerformanceSection,
  CompareProgressionSection,
  CompareSummarySection,
} from "@/components/compare/DeepCompareSections";
import { CompareAttemptNumberChart } from "@/components/compare/CompareAttemptNumberChart";
import type { Player, } from "@/types";
import type { PlayerTimePerformance, ProgressionPoint } from "@/types/historyProfiles";
import type { PlayerCompareSequencePair } from "@/types/playerCompare";

const player = (id: string, name: string): Player => ({
  id, name, initials: name[0], avatarGradient: "", avatarUrl: null,
  personalBest: 2.5, average: 3, attempts: 10, validAttempts: 9, dnfCount: 1,
  dailyWins: 0, trend: "same", isAk: false, isArchived: false,
});

const sequence: PlayerCompareSequencePair = {
  playerA: {
    longestSub3Streak: 4, longestNoDnfStreak: 8, fastestFirstAttemptHundredths: 280,
    attemptNumbers: Array.from({ length: 6 }, (_, index) => ({ attemptNumber: index + 1, samples: 2, validAttempts: 2, dnfCount: 0, averageHundredths: 300 + index })),
  },
  playerB: {
    longestSub3Streak: 3, longestNoDnfStreak: 7, fastestFirstAttemptHundredths: 290,
    attemptNumbers: [{ attemptNumber: 1, samples: 1, validAttempts: 1, dnfCount: 0, averageHundredths: 310 }],
  },
  rivalry: { playerALeadSeconds: 60, playerBLeadSeconds: 30, playerALeadTakes: 1, playerBLeadTakes: 0, qualifyingEventCount: 1 },
};

const performance: PlayerTimePerformance = {
  thresholds: [], extremeThresholds: [], medianHundredths: 290,
  standardDeviationHundredths: 12.5, fastestThreeAverageHundredths: 270,
  fastestFiveAverageHundredths: 280, pbToAverageHundredths: 40,
  pbToMedianHundredths: 30,
};

const stats = {
  personalBestHundredths: 250, rank: 1, averageHundredths: 300,
  eventParticipations: 5, wins: 2, secondPlaces: 1, thirdPlaces: 1,
  validAttempts: 9, dnfCount: 1, eventLeadSeconds: 120, eventBestBreaks: 2,
};

describe("final deep compare sections", () => {
  it("renders grouped attempt bars, five initial slots and a disclosure without horizontal table markup", () => {
    const markup = renderToStaticMarkup(<CompareAttemptNumbersSection
      playerA={player("a", "Anna")}
      playerB={player("b", "Berta")}
      state={{ data: sequence, loading: false, error: "" }}
    />);
    expect(markup).toContain("data-attempt-number-chart");
    expect(markup).toContain("Versuch 5");
    expect(markup).not.toContain("Versuch 6");
    expect(markup).toContain("Weitere Versuche anzeigen");
    expect(markup).toContain("Berta: kein gültiger Durchschnitt");
    expect(markup).not.toContain("overflow-x-auto");
    expect(markup).not.toContain("<table");
  });

  it("renders both attempt series in distinct visible slots with accessible labels", () => {
    const markup = renderToStaticMarkup(<CompareAttemptNumberChart
      playerAName="Karl"
      playerBName="Paul"
      playerA={[{ attemptNumber: 2, samples: 2, validAttempts: 1, dnfCount: 1, averageHundredths: 451 }]}
      playerB={[{ attemptNumber: 2, samples: 2, validAttempts: 2, dnfCount: 0, averageHundredths: 445 }]}
    />);
    expect(markup).toContain('data-attempt-series="player-a"');
    expect(markup).toContain('data-attempt-series="player-b"');
    expect(markup).toContain("from-gold-600/60 to-gold-300");
    expect(markup).toContain("from-cyan-800/70 to-cyan-300");
    expect(markup).toContain('aria-label="Karl, Versuch 2: 4,51 s, 1 gültige von 2 Versuchen"');
    expect(markup).toContain('aria-label="Paul, Versuch 2: 4,45 s, 2 gültige von 2 Versuchen"');
    expect(markup).toContain("Höherer Balken = schnellerer Ø");
  });

  it("keeps a single available PB series visible when the other progression failed", () => {
    const markup = renderToStaticMarkup(<CompareProgressionSection
      playerA={player("a", "Anna")}
      playerB={player("b", "Berta")}
      state={{ data: { playerA: [progression("a1")], playerB: null, playerAError: false, playerBError: true }, loading: false, error: "" }}
    />);
    expect(markup).toContain("PB-Entwicklung");
    expect(markup).toContain("Anna");
    expect(markup).toContain("vorübergehend nicht verfügbar");
  });

  it("renders only the reduced consistency and event metric sets", () => {
    const state = { data: sequence, loading: false, error: "" };
    const markup = renderToStaticMarkup(<>
      <CompareConsistencySection sequence={state} performanceA={performance} performanceB={performance} />
      <CompareEventPerformanceSection statsA={stats} statsB={stats} sequence={state} />
    </>);
    expect(markup).toContain("Längste 2,xx-Serie");
    expect(markup).toContain("Längste Serie ohne DNF");
    expect(markup).toContain("Konstanz / Streuung");
    expect(markup).toContain("Event-Führungszeit gesamt");
    expect(markup).toContain("Eventbestzeiten gebrochen");
    expect(markup).toContain("Schnellster erster Versuch");
    expect(markup).not.toContain("Aktuelle 2,xx-Serie");
    expect(markup).not.toContain("Zeitspanne");
    expect(markup).not.toContain("Badge Battle");
    expect(markup).not.toContain("Prestige");
    expect(markup).not.toContain("Stat Madness");
  });

  it("renders an unweighted summary without winner wording", () => {
    const markup = renderToStaticMarkup(<CompareSummarySection
      playerA={player("a", "Anna")}
      playerB={player("b", "Berta")}
      categories={[
        { key: "a", label: "A", group: "Hauptwerte", left: 1, right: 2, direction: "lower" },
        { key: "b", label: "B", group: "Speed", left: 1, right: 2, direction: "higher" },
        { key: "c", label: "C", group: "Events", left: 2, right: 2, direction: "higher" },
        { key: "d", label: "D", group: "Most Wanted", left: null, right: 2, direction: "higher" },
      ]}
    />);
    expect(markup).toContain("Wer liegt vorne?");
    expect(markup).toContain("Kategorienbilanz");
    expect(markup).toContain("1 Kategorie war");
    expect(markup).toContain("kein offizielles Gesamtranking");
    expect(markup).not.toContain("Experimentell");
    expect(markup).not.toContain("gewinnt");
  });
});

function progression(id: string): ProgressionPoint {
  return { id, timeHundredths: 300, previousHundredths: null, achievedAt: "2026-01-01", achievedDate: "2026-01-01", eventId: null, sourceLabel: "Event", sourceType: "attempt", improvementHundredths: null, durationDays: 1, isCurrent: true };
}
