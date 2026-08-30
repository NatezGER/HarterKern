import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  season: "all-time" as "all-time" | 2026,
  isAllTime: true,
  compare: null as unknown,
  deep: null as unknown,
}));

const players = [
  { id: "a", name: "Anna", initials: "A", avatarGradient: "", avatarUrl: null, personalBest: 2.5, average: 3, attempts: 10, validAttempts: 9, dnfCount: 1, dailyWins: 0, trend: "same" as const, isAk: false, isArchived: false },
  { id: "b", name: "Berta", initials: "B", avatarGradient: "", avatarUrl: null, personalBest: 2.7, average: 3.2, attempts: 10, validAttempts: 8, dnfCount: 2, dailyWins: 0, trend: "same" as const, isAk: false, isArchived: false },
  { id: "ak", name: "Außer Konkurrenz", initials: "AK", avatarGradient: "", avatarUrl: null, personalBest: 2, average: 2.5, attempts: 3, validAttempts: 3, dnfCount: 0, dailyWins: 0, trend: "same" as const, isAk: true, isArchived: false },
];

vi.mock("@/hooks/useEffectivePublicData", () => ({
  useEffectivePublicData: () => ({ data: { players } }),
}));
vi.mock("@/hooks/useSeason", () => ({
  useSeason: () => ({ season: state.season, isAllTime: state.isAllTime }),
}));
vi.mock("@/hooks/usePlayerCompare", () => ({
  usePlayerCompare: () => state.compare,
}));
vi.mock("@/hooks/usePlayerDeepCompare", () => ({
  usePlayerDeepCompare: () => state.deep,
}));
vi.mock("@/hooks/usePlayerMostWantedStatistics", () => ({
  usePlayerMostWantedStatistics: () => ({
    data: { a: { allTimeHits: 41, seasonFirstHits: 8 }, b: { allTimeHits: 37, seasonFirstHits: 5 } },
    loading: false,
    error: "",
  }),
}));

import { PlayerComparePage } from "@/pages/PlayerComparePage";

const coreA = {
  identity: { id: "a", name: "Anna", avatarUrl: null, avatarPath: null, isAk: false },
  statistics: { personalBestHundredths: 250, rank: 2, averageHundredths: 300, eventParticipations: 5, wins: 2, secondPlaces: 1, thirdPlaces: 1, validAttempts: 9, dnfCount: 1, eventLeadSeconds: 0, eventBestBreaks: 0 },
};
const coreB = {
  identity: { id: "b", name: "Berta", avatarUrl: null, avatarPath: null, isAk: false },
  statistics: { personalBestHundredths: 270, rank: 4, averageHundredths: 320, eventParticipations: 4, wins: 1, secondPlaces: 1, thirdPlaces: 0, validAttempts: 8, dnfCount: 2, eventLeadSeconds: 0, eventBestBreaks: 0 },
};
const emptyHeadToHead = {
  playerAWins: 0, playerBWins: 0, ties: 0, totalDuels: 0, events: [],
  closestDuel: null, biggestWin: null, currentStreak: null, longestStreak: null,
};

describe("PlayerComparePage", () => {
  beforeEach(() => {
    state.season = "all-time";
    state.isAllTime = true;
    state.compare = {
      core: { data: { playerA: coreA, playerB: coreB }, loading: false, error: "" },
      speed: { data: { playerA: performance(90, 250), playerB: performance(80, 290) }, loading: false, error: "" },
      headToHead: { data: emptyHeadToHead, loading: false, error: "" },
    };
    state.deep = {
      sequence: { data: sequence(), loading: false, error: "" },
      progression: { data: { playerA: [], playerB: [], playerAError: false, playerBError: false }, loading: false, error: "" },
    };
  });

  it("renders the route and assigns DNF and speed values", () => {
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    expect(markup).toContain("Spielervergleich");
    expect(markup).toContain("Hauptstatistiken");
    expect(markup).toContain("DNF-Quote");
    expect(markup).toContain("10 %");
    expect(markup).toContain("20 %");
    expect(markup).toContain("Unter 5 s");
    expect(markup).toContain("Unter 2,5 s");
    expect(markup).toContain("Ø der 3 schnellsten");
    expect(markup).toContain("Median");
    expect(markup).toContain('data-compare-metric="Personal Best"');
    expect(markup).not.toContain('data-compare-metric="Rang"');
    expect(markup).toContain("90 %");
    expect(markup).toContain("80 %");
    expect(markup).toContain("Vorn");
    expect(markup).not.toContain("Außer Konkurrenz");
  });

  it("renders a useful empty state without query parameters", () => {
    const markup = renderCompare("/compare");
    expect(markup).toContain("Zwei Spieler auswählen");
    expect(markup).toContain("Spieler A auswählen");
    expect(markup).toContain("Spieler B auswählen");
  });

  it("rejects the same player on both sides", () => {
    const markup = renderCompare("/compare?playerA=a&playerB=a");
    expect(markup).toContain("ungültig oder doppelt");
  });

  it("renders season values without fake zeroes", () => {
    state.season = 2026;
    state.isAllTime = false;
    state.compare = {
      core: { data: { playerA: { ...coreA, statistics: { ...coreA.statistics, rank: 1, personalBestHundredths: 280 } }, playerB: { ...coreB, statistics: { ...coreB.statistics, rank: null, personalBestHundredths: null, averageHundredths: null, validAttempts: 0, dnfCount: 0 } } }, loading: false, error: "" },
      speed: { data: { playerA: performance(100, 280), playerB: performance(0, null, 0) }, loading: false, error: "" },
      headToHead: { data: emptyHeadToHead, loading: false, error: "" },
    };
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    expect(markup).toContain("Saison 2026");
    expect(markup).toContain("Saison-PB");
    expect(markup).toContain("2,80 s");
    expect(markup).not.toContain("0,00 l");
  });

  it("keeps core metrics visible when speed fails", () => {
    state.compare = {
      core: { data: { playerA: coreA, playerB: coreB }, loading: false, error: "" },
      speed: { data: null, loading: false, error: "Die Speed-Werte konnten nicht geladen werden." },
      headToHead: { data: emptyHeadToHead, loading: false, error: "" },
    };
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    expect(markup).toContain("Hauptstatistiken");
    expect(markup).toContain("Die Speed-Werte konnten nicht geladen werden.");
  });

  it("renders the H2H score, five latest duels and existing event links", () => {
    const events = Array.from({ length: 6 }, (_, index) => ({
      eventId: `event-${index + 1}`,
      eventName: `Rivalry ${index + 1}`,
      eventDate: `2026-01-0${6 - index}`,
      playerATimeHundredths: 300,
      playerBTimeHundredths: index === 1 ? 300 : 320,
      winner: index === 1 ? "tie" as const : "a" as const,
      differenceHundredths: index === 1 ? 0 : 20,
    }));
    state.compare = {
      core: { data: { playerA: coreA, playerB: coreB }, loading: false, error: "" },
      speed: { data: null, loading: false, error: "" },
      headToHead: { data: {
        playerAWins: 5, playerBWins: 0, ties: 1, totalDuels: 6, events,
        closestDuel: events[0], biggestWin: events[0],
        currentStreak: { winners: ["a"], length: 1 },
        longestStreak: { winners: ["a"], length: 4 },
      }, loading: false, error: "" },
    };
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    expect(markup).toContain("Head to Head");
    expect(markup).toContain("5 : 0");
    expect(markup).toContain("1 Unentschieden · 6 gemeinsame Duelle");
    expect(markup).toContain('href="/events/event-1"');
    expect(markup).toContain("Rivalry 5");
    expect(markup).not.toContain("Rivalry 6");
    expect(markup).toContain("Alle 6 Duelle anzeigen");
    expect(markup).toContain("Direkte Führungszeit");
    expect(markup).toContain("Führung direkt abgenommen");
  });

  it("keeps P11A core visible when H2H fails", () => {
    state.compare = {
      core: { data: { playerA: coreA, playerB: coreB }, loading: false, error: "" },
      speed: { data: null, loading: false, error: "" },
      headToHead: { data: null, loading: false, error: "Head to Head konnte nicht geladen werden." },
    };
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    expect(markup).toContain("Hauptstatistiken");
    expect(markup).toContain("Head to Head konnte nicht geladen werden.");
  });

  it("uses the exact final section order", () => {
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    const labels = ["Head to Head", "PB-Entwicklung", "Nach Versuchsnummer", "Hauptstatistiken", "Speed &amp; Peak Performance", "Konstanz &amp; Serien", "Event- &amp; Leistungswerte", "Most Wanted", "Wer liegt vorne?"];
    expect(labels.map((label) => markup.indexOf(label))).toEqual([...labels.map((label) => markup.indexOf(label))].sort((a, b) => a - b));
  });

  it("shows canonical Most Wanted values and season first hits only in season mode", () => {
    expect(renderCompare("/compare?playerA=a&playerB=b")).toContain("Most-Wanted Treffer");
    expect(renderCompare("/compare?playerA=a&playerB=b")).not.toContain("Saison-Ersttreffer 2026");
    state.season = 2026;
    state.isAllTime = false;
    expect(renderCompare("/compare?playerA=a&playerB=b")).toContain("Saison-Ersttreffer 2026");
  });

  it("keeps progression and P11A/P11B visible when sequence data fails", () => {
    state.deep = {
      sequence: { data: null, loading: false, error: "Serien und Versuchsnummern konnten nicht geladen werden." },
      progression: { data: { playerA: [], playerB: [], playerAError: false, playerBError: false }, loading: false, error: "" },
    };
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    expect(markup).toContain("Hauptstatistiken");
    expect(markup).toContain("PB-Entwicklung");
    expect(markup).toContain("Head to Head");
    expect(markup).toContain("Serien und Versuchsnummern konnten nicht geladen werden.");
  });

  it("keeps attempt numbers and H2H visible when progression fails", () => {
    state.deep = {
      sequence: { data: sequence(), loading: false, error: "" },
      progression: { data: null, loading: false, error: "Die PB-Entwicklung konnte nicht geladen werden." },
    };
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    expect(markup).toContain("Nach Versuchsnummer");
    expect(markup).toContain("Head to Head");
    expect(markup).toContain("Die PB-Entwicklung konnte nicht geladen werden.");
  });
});

function renderCompare(entry: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
      <Routes><Route path="/compare" element={<PlayerComparePage />} /></Routes>
    </MemoryRouter>,
  );
}

function performance(sub5Percent: number, medianHundredths: number | null, total = 10) {
  return {
    thresholds: [
      { seconds: 5 as const, count: Math.round(total * sub5Percent / 100), total, percent: sub5Percent },
      { seconds: 4 as const, count: 7, total, percent: total ? 70 : 0 },
      { seconds: 3 as const, count: 2, total, percent: total ? 20 : 0 },
    ],
    extremeThresholds: [
      { seconds: 2.5 as const, count: 1, total, percent: total ? 10 : 0 },
      { seconds: 2 as const, count: 0, total, percent: 0 },
    ],
    medianHundredths,
    standardDeviationHundredths: medianHundredths == null ? null : 12,
    fastestThreeAverageHundredths: medianHundredths == null ? null : medianHundredths - 20,
    fastestFiveAverageHundredths: medianHundredths == null ? null : medianHundredths - 10,
    pbToAverageHundredths: medianHundredths == null ? null : 50,
    pbToMedianHundredths: medianHundredths == null ? null : 30,
  };
}

function sequence() {
  const points = Array.from({ length: 2 }, (_, index) => ({ attemptNumber: index + 1, samples: 2, validAttempts: 2, dnfCount: 0, averageHundredths: 300 + index }));
  return {
    playerA: { longestSub3Streak: 2, longestNoDnfStreak: 4, fastestFirstAttemptHundredths: 280, attemptNumbers: points },
    playerB: { longestSub3Streak: 1, longestNoDnfStreak: 3, fastestFirstAttemptHundredths: 290, attemptNumbers: points },
    rivalry: { playerALeadSeconds: 60, playerBLeadSeconds: 30, playerALeadTakes: 1, playerBLeadTakes: 0, qualifyingEventCount: 1 },
  };
}
