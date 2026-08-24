import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  season: "all-time" as "all-time" | 2026,
  isAllTime: true,
  compare: null as unknown,
  deep: { data: null, loading: false, error: "Deep Compare konnte nicht geladen werden." },
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
      speed: { data: { playerA: { timeHundredths: [199, 240, 250, 300, 400], thresholds: [{ seconds: 5, count: 9, total: 10, percent: 90 }, { seconds: 4, count: 7, total: 10, percent: 70 }, { seconds: 3, count: 2, total: 10, percent: 20 }] }, playerB: { timeHundredths: [270, 280, 290, 320, 450], thresholds: [{ seconds: 5, count: 8, total: 10, percent: 80 }, { seconds: 4, count: 6, total: 10, percent: 60 }, { seconds: 3, count: 1, total: 10, percent: 10 }] } }, loading: false, error: "" },
      headToHead: { data: emptyHeadToHead, loading: false, error: "" },
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
      speed: { data: { playerA: { thresholds: [{ seconds: 5, count: 1, total: 1, percent: 100 }] }, playerB: { thresholds: [{ seconds: 5, count: 0, total: 0, percent: 0 }] } }, loading: false, error: "" },
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

  it("keeps core, speed and H2H visible when Deep Compare fails", () => {
    const markup = renderCompare("/compare?playerA=a&playerB=b");
    expect(markup).toContain("Hauptstatistiken");
    expect(markup).toContain("Speed &amp; Peak Performance");
    expect(markup).toContain("Head to Head");
    expect(markup).toContain("Deep Compare konnte nicht geladen werden.");
  });
});

function renderCompare(entry: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
      <Routes><Route path="/compare" element={<PlayerComparePage />} /></Routes>
    </MemoryRouter>,
  );
}
