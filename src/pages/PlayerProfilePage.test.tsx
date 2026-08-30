import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { PlayerSeasonProfile, TrophyAward } from "@/types/historyProfiles";

const selectedSeason = vi.hoisted(() => ({
  season: "all-time" as "all-time" | 2026,
  isAllTime: true,
}));

const profile = vi.hoisted(() => ({
  core: {
    data: {
      id: "player-1",
      name: "Paul",
      avatarUrl: null,
      avatarPath: null,
      isAk: false,
      personalBestHundredths: 250,
      rank: 2,
      averageHundredths: 320,
      eventParticipations: 3,
      wins: 1,
      secondPlaces: 1,
      thirdPlaces: 0,
      validAttempts: 10,
      dnfCount: 2,
      eventLeadSeconds: 3900,
      eventBestBreaks: 4,
    },
    loading: false,
    error: "",
    retry: vi.fn(),
  },
  season: {
    data: null as PlayerSeasonProfile | null,
    loading: false,
    error: "",
    retry: vi.fn(),
  },
  badges: { data: null, loading: false, error: "Dieser Bereich konnte nicht geladen werden.", retry: vi.fn() },
  trophies: { data: [] as TrophyAward[], loading: false, error: "", retry: vi.fn() },
  prestige: { data: { pbCount: 0, largestPbImprovementHundredths: null, averagePbImprovementHundredths: null, worldRecordCount: 0, worldRecordDays: 0, longestWorldRecordDays: 0, visibleBadgeCount: 0 }, loading: false, error: "", retry: vi.fn() },
  progression: { data: { personal: [], worldRecords: [] }, loading: false, error: "", retry: vi.fn() },
  performance: { data: { thresholds: [
    { seconds: 5, count: 9, total: 10, percent: 90 },
    { seconds: 4, count: 7, total: 10, percent: 70 },
    { seconds: 3, count: 2, total: 10, percent: 20 },
  ] }, loading: false, error: "", retry: vi.fn() },
  bingo: { data: { fields: [], summary: { collectedEndings: 0, bronzeFields: 0, silverFields: 0, goldFields: 0, bronzeLines: 0, silverLines: 0, goldLines: 0, highestBadgeTier: null } }, loading: false, error: "", retry: vi.fn() },
  attemptNumbers: { data: [], loading: false, error: "", retry: vi.fn() },
  events: { data: [], loading: false, error: "", retry: vi.fn() },
}));

vi.mock("@/hooks/useHistoryProfiles", () => ({
  usePlayerProfileDetail: () => profile,
}));
vi.mock("@/hooks/useSeason", () => ({
  useSeason: () => selectedSeason,
}));
vi.mock("@/hooks/usePlayerMostWantedStatistics", () => ({
  usePlayerMostWantedStatistics: () => ({ data: { "player-1": { allTimeHits: 41, seasonFirstHits: 8 } }, loading: false, error: "" }),
}));
vi.mock("@/hooks/useEffectivePublicData", () => ({
  useEffectivePublicData: () => ({ data: { players: [], leaderboard: [] } }),
}));
vi.mock("@/hooks/usePlayerRivalries", () => ({
  usePlayerRivalries: () => ({ data: [], loading: false, error: "" }),
}));
vi.mock("@/components/compare/ProfileCompareAction", () => ({
  ProfileCompareAction: () => <span>Vergleichen mit …</span>,
}));

import { PlayerProfilePage } from "@/pages/PlayerProfilePage";

describe("PlayerProfilePage optional failures", () => {
  it("keeps the core visible when badges fail", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/player/player-1"]}>
        <Routes><Route path="/player/:id" element={<PlayerProfilePage />} /></Routes>
      </MemoryRouter>,
    );
    expect(markup).toContain("Paul");
    expect(markup).toContain("Weltrang #2");
    expect(markup).toContain("Most-Wanted Treffer · All-Time");
    expect(markup).toContain(">41<");
    expect(markup).toContain("Personal Best");
    expect(markup).toContain("Gültige Versuche");
    expect(markup).toContain("2 · 16,7 %");
    expect(markup).toContain("Unter 5 s");
    expect(markup).toContain("Eventführung");
    expect(markup).toContain("1 Std. 5 Min.");
    expect(markup).toContain("Eventbestzeiten gebrochen");
    expect(markup).not.toContain("Gültig / DNF");
    expect(markup).not.toContain("last:col-span-2");
    expect(markup).toContain("Dieser Bereich konnte nicht geladen werden.");
    expect(markup).not.toContain("statement timeout");
  });

  it("keeps finalized season trophies visible in All-Time and season mode", () => {
    profile.trophies.data = [{
      key: "season-trophy:2026:player-1:1",
      competitionType: "season",
      scopeType: "season",
      competitionId: "season-2026",
      seasonKey: "2026",
      competitionName: "Saisonmeister 2026",
      year: 2026,
      eventDate: "2026-12-31",
      placement: 1,
      tier: "gold",
      playerId: "player-1",
      guestId: null,
      playerName: "Paul",
      awardedAt: "2027-01-01T00:00:00Z",
    }];
    selectedSeason.season = "all-time";
    selectedSeason.isAllTime = true;
    const allTimeMarkup = renderProfile();
    selectedSeason.season = 2026;
    selectedSeason.isAllTime = false;
    const seasonMarkup = renderProfile();
    expect(allTimeMarkup).toContain("Saisonmeister");
    expect(allTimeMarkup).toContain("Saison 2026");
    expect(seasonMarkup).toContain("Saisonmeister");
    expect(seasonMarkup).toContain("Saison 2026");
    profile.trophies.data = [];
    selectedSeason.season = "all-time";
    selectedSeason.isAllTime = true;
  });

  it("shows clear season labels and an empty state without fake time values", () => {
    selectedSeason.season = 2026;
    selectedSeason.isAllTime = false;
    profile.season.data = {
      personalBestHundredths: null,
      rank: null,
      averageHundredths: null,
      eventParticipations: 0,
      wins: 0,
      secondPlaces: 0,
      thirdPlaces: 0,
      validAttempts: 0,
    dnfCount: 0, eventLeadSeconds: 0, eventBestBreaks: 0,
    };
    const markup = renderProfile();
    expect(markup).toContain("Saison-PB-Progression");
    expect(markup).toContain("Noch keine Saison-PB 2026 vorhanden.");
    expect(markup).toContain("Noch keine qualifizierte Saisonzeit 2026.");
    expect(markup).toContain("Karriere · All-Time");
    expect(markup).not.toContain("0,00");
    profile.season.data = null;
    selectedSeason.season = "all-time";
    selectedSeason.isAllTime = true;
  });

  it("uses season rank and season PB in the profile hero", () => {
    selectedSeason.season = 2026;
    selectedSeason.isAllTime = false;
    profile.season.data = {
      personalBestHundredths: 280,
      rank: 4,
      averageHundredths: 350,
      eventParticipations: 2,
      wins: 1,
      secondPlaces: 0,
      thirdPlaces: 0,
      validAttempts: 5,
    dnfCount: 1, eventLeadSeconds: 0, eventBestBreaks: 0,
    };
    const markup = renderProfile();
    expect(markup).toContain("Saisonrang #4");
    expect(markup).toContain("Saison-PB 2026");
    expect(markup).toContain("2,80 s");
    expect(markup).not.toContain("Weltrang #2");
    profile.season.data = null;
    selectedSeason.season = "all-time";
    selectedSeason.isAllTime = true;
  });

  it("places Rivalries directly after attempt-number performance and before statistics", () => {
    const markup = renderProfile();
    const attemptNumbers = markup.indexOf("Nach Versuchsnummer");
    const rivalries = markup.indexOf(">Rivalries<");
    const statistics = markup.indexOf(">Statistik<");
    expect(attemptNumbers).toBeGreaterThan(-1);
    expect(rivalries).toBeGreaterThan(attemptNumbers);
    expect(statistics).toBeGreaterThan(rivalries);
  });
});

function renderProfile() {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/player/player-1"]}>
      <Routes><Route path="/player/:id" element={<PlayerProfilePage />} /></Routes>
    </MemoryRouter>,
  );
}
