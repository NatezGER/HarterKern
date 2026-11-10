import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
vi.mock("@/hooks/useSeason", () => ({ useSeason: () => ({ season: "all-time" }) }));
vi.mock("@/hooks/useEffectivePublicData", () => ({ useEffectivePublicData: () => ({ data: {
  badgeStatistics: { season: "all-time", dashboard: { metrics: [
    { key: "bingo-lines", group: "bingo", title: "Bingos", format: "count", rankings: [] },
    { key: "badge-total", group: "achievements", title: "Badge-Familien", format: "count", rankings: [] },
  ] } },
} }) }));
vi.mock("@/components/common/OptionalDataState", () => ({ OptionalDataState: ({ children }: { children: ReactNode }) => children }));
import { BadgeRankingSections } from "./BadgeRankingSections";
it("retains BINGO while hiding only the requested achievement presentation", () => {
  const performance = renderToStaticMarkup(<BadgeRankingSections groups={["bingo"]} showHeadings={false} />);
  expect(performance).toContain('data-metric-key="bingo-lines"');
  expect(performance).not.toContain("Badge-Familien");
  const original = renderToStaticMarkup(<BadgeRankingSections />);
  expect(original).toContain("Badge-Familien"); expect(original).toContain("Achievements");
  expect(original).toContain('data-metric-key="bingo-lines"');
});
