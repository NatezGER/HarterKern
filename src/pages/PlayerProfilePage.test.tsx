import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

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
  trophies: { data: [], loading: false, error: "", retry: vi.fn() },
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
  useSeason: () => ({ season: "all-time", isAllTime: true }),
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
});
