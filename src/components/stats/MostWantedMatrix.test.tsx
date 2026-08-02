import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
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
});
