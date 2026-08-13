import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
import { selectionAfterSeasonChange } from "@/components/stats/mostWantedSelection";
import type { MostWantedSnapshot } from "@/types";

const data: MostWantedSnapshot = {
  reached: 1,
  total: 100,
  percent: 1,
  openEndings: Array.from({ length: 99 }, (_, index) => index + 1),
  mostCommonEnding: 0,
  mostCommonHits: 2,
  rarestAchievedEndings: [0],
  endings: Array.from({ length: 100 }, (_, ending) => ({
    ending,
    label: String(ending).padStart(2, "0"),
    achieved: ending === 0,
    hitCount: ending === 0 ? 2 : 0,
    participantCount: ending === 0 ? 1 : 0,
    playerId: ending === 0 ? "player-1" : null,
    guestId: null,
    playerName: ending === 0 ? "Paul" : null,
    avatarUrl: ending === 0 ? "https://example.com/paul.webp" : null,
    isGuest: false,
    timeHundredths: ending === 0 ? 300 : null,
    occurredAt: ending === 0 ? "2026-01-01T12:00:00Z" : null,
    occurredDate: ending === 0 ? "2026-01-01" : null,
    hasExactTime: ending === 0,
    eventId: null,
    sourceType: ending === 0 ? "attempt" : null,
    sourceLabel: null,
  })),
};

describe("MostWantedMatrix", () => {
  it("starts collapsed while keeping accessible progress and all text alternatives", () => {
    const markup = renderToStaticMarkup(<MostWantedMatrix data={data} />);
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="most-wanted-grid"');
    expect(markup).toContain('aria-valuenow="1"');
    expect(markup).toContain('aria-valuemax="100"');
    expect(markup).toContain("Endung 00");
    expect(markup).toContain("Endung 99");
    expect(markup).toContain("https://example.com/paul.webp");
  });

  it("marks a seasonal snapshot without changing the All-Time default", () => {
    const allTime = renderToStaticMarkup(<MostWantedMatrix data={data} />);
    const season = renderToStaticMarkup(<MostWantedMatrix data={data} season={2026} />);
    expect(allTime).toContain("Liga-Jagd");
    expect(season).toContain("Saison 2026");
    expect(season).toContain("from-emerald-700");
  });

  it("shows a compact empty state for a season with zero hunters", () => {
    const empty = {
      ...data,
      reached: 0,
      percent: 0,
      openEndings: Array.from({ length: 100 }, (_, ending) => ending),
      mostCommonEnding: null,
      mostCommonHits: 0,
      rarestAchievedEndings: [],
      endings: data.endings.map((ending) => ({
        ...ending,
        achieved: false,
        hitCount: 0,
        participantCount: 0,
        playerId: null,
        playerName: null,
      })),
    };
    const markup = renderToStaticMarkup(<MostWantedMatrix data={empty} season={2026} />);
    expect(markup).toContain('aria-valuenow="0"');
    expect(markup).toContain("In Saison 2026 wurde noch keine Endung gefunden.");
  });

  it("closes an open All-Time hunter detail when switching to 2026", () => {
    expect(selectionAfterSeasonChange(data.endings[0], "all-time", 2026)).toBeNull();
  });

  it("closes an open season hunter detail when switching back to All-Time", () => {
    expect(selectionAfterSeasonChange(data.endings[0], 2026, "all-time")).toBeNull();
  });
});
