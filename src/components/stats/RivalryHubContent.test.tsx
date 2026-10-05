import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RivalryHubContent } from "@/components/stats/RivalryHubContent";
import type { RivalryHubData } from "@/types/statDashboard";

const pairs = Array.from({ length: 7 }, (_, index) => ({
  playerLowId: `a-${index}`, playerHighId: `b-${index}`,
  playerLowName: `Alpha ${index}`, playerHighName: `Beta ${index}`,
  rivalryEvents: index === 6 ? 0 : 1,
  directTakeovers: index === 6 ? 2 : 4,
  allDirectTakeovers: index === 6 ? 2 : 4,
  rivalryDirectTakeovers: index === 6 ? 0 : 4,
  levelReached: index !== 6,
  commonEvents: 2,
  firstRivalryDate: index === 6 ? null : "2026-01-01",
  lastRivalryDate: index === 6 ? null : "2026-02-01",
  spanDays: index === 6 ? null : 31,
}));

const data: RivalryHubData = {
  summary: { rivalryEvents: 6, playersWithRivalry: 12, directTakeovers: 26, strongestPair: pairs[0], longestPair: pairs[0] },
  pairs,
};

describe("RivalryHubContent", () => {
  it("shows every rivalry instead of limiting the complete section to a top list", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><RivalryHubContent data={data} /></MemoryRouter>);
    expect(markup).toContain("Alle Rivalries");
    for (let index = 0; index < 6; index += 1) expect(markup).toContain(`Alpha ${index} ↔ Beta ${index}`);
  });

  it("keeps direct duels separate and links every pair to compare", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><RivalryHubContent data={data} /></MemoryRouter>);
    expect(markup).toContain("Direkte Duelle");
    expect(markup).toContain("Direct Duel");
    expect(markup).toContain("/compare?playerA=a-6&amp;playerB=b-6");
    expect(markup).toContain("2");
  });
});
