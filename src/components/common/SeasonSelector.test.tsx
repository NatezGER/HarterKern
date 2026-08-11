import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SeasonSelector } from "@/components/common/SeasonSelector";

const seasonState = vi.hoisted(() => ({
  season: "all-time" as "all-time" | number,
  isAllTime: true,
}));

vi.mock("@/hooks/useSeason", () => ({
  useSeason: () => ({ ...seasonState, setSeason: vi.fn() }),
}));

describe("SeasonSelector", () => {
  it("shows All-Time by default on mobile and desktop", () => {
    const markup = renderToStaticMarkup(<SeasonSelector />);
    expect(markup).toContain("aria-label=");
    expect(markup).toContain("Ewig");
    expect(markup).toContain("2026");
    expect(markup).not.toContain('class="hidden');
    expect(markup).toContain("text-gold-300");
  });

  it("uses subtle green accents for a year season", () => {
    seasonState.season = 2026;
    seasonState.isAllTime = false;
    const markup = renderToStaticMarkup(<SeasonSelector />);
    expect(markup).toContain("text-emerald-200");
    expect(markup).toMatch(/value="2026"[^>]*selected=""/);
  });
});
