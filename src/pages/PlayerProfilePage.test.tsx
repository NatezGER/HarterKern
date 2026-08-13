import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { TrophyAward } from "@/types/historyProfiles";

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
    },
    loading: false,
    error: "",
    retry: vi.fn(),
  },
  season: { data: null, loading: false, error: "", retry: vi.fn() },
  badges: { data: null, loading: false, error: "Dieser Bereich konnte nicht geladen werden.", retry: vi.fn() },
  trophies: { data: [] as TrophyAward[], loading: false, error: "", retry: vi.fn() },
  prestige: { data: { pbCount: 0, largestPbImprovementHundredths: null, averagePbImprovementHundredths: null, worldRecordCount: 0, worldRecordDays: 0, longestWorldRecordDays: 0, visibleBadgeCount: 0 }, loading: false, error: "", retry: vi.fn() },
  progression: { data: { personal: [], worldRecords: [] }, loading: false, error: "", retry: vi.fn() },
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
    expect(allTimeMarkup).toContain("Saisonmeister 2026");
    expect(seasonMarkup).toContain("Saisonmeister 2026");
    profile.trophies.data = [];
    selectedSeason.season = "all-time";
    selectedSeason.isAllTime = true;
  });
});

function renderProfile() {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/player/player-1"]}>
      <Routes><Route path="/player/:id" element={<PlayerProfilePage />} /></Routes>
    </MemoryRouter>,
  );
}
