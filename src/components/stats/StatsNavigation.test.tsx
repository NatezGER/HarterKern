import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StatsNavigation } from "@/components/stats/StatsNavigation";

describe("StatsNavigation", () => {
  it("links all five stats routes and marks the current subpage", () => {
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={["/stats/rivalries"]}><StatsNavigation /></MemoryRouter>);
    expect(markup).toContain('href="/stats"');
    expect(markup).toContain('href="/stats/performance"');
    expect(markup).toContain('href="/stats/most-wanted"');
    expect(markup).toContain('href="/stats/rivalries"');
    expect(markup).toContain('href="/stats/badges"');
    expect(markup).toMatch(/aria-current="page"[^>]*href="\/stats\/rivalries"/);
  });
  it("keeps Most Wanted reachable in the horizontally scrollable mobile/desktop nav", () => {
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={["/stats/most-wanted"]}><StatsNavigation /></MemoryRouter>);
    expect(markup).toMatch(/aria-current="page"[^>]*href="\/stats\/most-wanted"/);
    expect(markup).toContain("overflow-x-auto");
    expect(markup).toContain("min-w-max");
    expect(markup).toContain("Most Wanted");
  });
});
