import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StatsNavigation } from "@/components/stats/StatsNavigation";

describe("StatsNavigation", () => {
  it("links all four stats routes and marks the current subpage", () => {
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={["/stats/rivalries"]}><StatsNavigation /></MemoryRouter>);
    expect(markup).toContain('href="/stats"');
    expect(markup).toContain('href="/stats/performance"');
    expect(markup).toContain('href="/stats/rivalries"');
    expect(markup).toContain('href="/stats/badges"');
    expect(markup).toMatch(/aria-current="page"[^>]*href="\/stats\/rivalries"/);
  });
});
