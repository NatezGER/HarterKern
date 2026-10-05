import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RivalryHubContent } from "@/components/stats/RivalryHubContent";

describe("RivalryHubContent large responses", () => {
  it("bounds the first render while retaining the complete response for progressive rendering", () => {
    const pairs = Array.from({ length: 100 }, (_, index) => ({
      playerLowId: `low-${index}`,
      playerHighId: `high-${index}`,
      playerLowName: `Low ${index}`,
      playerHighName: `High ${index}`,
      rivalryEvents: 1,
      directTakeovers: 5,
      allDirectTakeovers: 5,
      rivalryDirectTakeovers: 3,
      levelReached: true,
      commonEvents: 1,
      spanDays: index,
      firstRivalryDate: "2026-01-01",
      lastRivalryDate: "2026-01-02",
    }));
    const markup = renderToStaticMarkup(<MemoryRouter><RivalryHubContent data={{
      summary: { rivalryEvents: 100, playersWithRivalry: 101, directTakeovers: 500, strongestPair: null, longestPair: null },
      pairs,
    }} /></MemoryRouter>);
    expect(markup.match(/Im Vergleich öffnen/g)).toHaveLength(40);
    expect(markup).toContain("Low 0 ↔ High 0");
  });
});
