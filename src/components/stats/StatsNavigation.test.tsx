import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StatsNavigation } from "@/components/stats/StatsNavigation";

describe("StatsNavigation", () => {
  it("links all five stats routes and marks the current subpage", () => {
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={["/stats/rivalries"]}><StatsNavigation /></MemoryRouter>);
    expect(markup).toContain('href="/stats"');
    expect(markup).toContain('href="/stats/performance"');
    expect(markup).toContain('href="/stats/milestones"');
    expect(markup).toContain('href="/stats/rivalries"');
    expect(markup).toContain('href="/stats/badges"');
    expect(markup).toMatch(/aria-current="page"[^>]*href="\/stats\/rivalries"/);
  });
  it("keeps every destination visible in a sticky 3+2 mobile grid without scroll", () => {
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={["/stats/milestones"]}><StatsNavigation /></MemoryRouter>);
    expect(markup).toMatch(/aria-current="page"[^>]*href="\/stats\/milestones"/);
    expect(markup).not.toContain("overflow-x-auto");
    expect(markup).not.toContain("min-w-max");
    expect(markup).toContain("grid-cols-6");
    expect(markup).toContain("sticky top-20 z-30");
    expect(markup).toContain("Meilensteine");
  });
});
