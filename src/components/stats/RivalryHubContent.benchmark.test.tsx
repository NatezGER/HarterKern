import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RivalryHubContent } from "@/components/stats/RivalryHubContent";
import { hubFixture, pairFixture } from "./rivalryHubTestFixtures";
describe("RivalryHubContent large responses", () => {
  it("bounds first render to spotlight plus 20 cards without discarding response data", () => {
    const pairs = Array.from({ length: 100 }, (_, index) => pairFixture(index));
    const markup = renderToStaticMarkup(<MemoryRouter><RivalryHubContent data={hubFixture(pairs)} /></MemoryRouter>);
    expect(markup.match(/Im Vergleich öffnen/g)).toHaveLength(21);
    expect(markup).toContain("Alpha 0 ↔ Beta 0");
    expect(markup).not.toContain("Alpha 20 ↔ Beta 20");
    expect(pairs).toHaveLength(100);
  });
});
