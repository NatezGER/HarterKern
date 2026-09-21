import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompareThemeBlocks } from "@/components/compare/CompareThemeBlocks";
import type { Player } from "@/types";
import type { PlayerCompareMetricBundle } from "@/types/playerCompare";

const player = (id: string, name: string): Player => ({
  id, name, initials: name.slice(0, 2), avatarGradient: "from-red-500 to-red-900",
  avatarUrl: null, personalBest: 250, average: 300, attempts: 10,
  validAttempts: 10, dnfCount: 0, dailyWins: 0, trend: "same",
  isAk: false, isArchived: false,
});

describe("CompareThemeBlocks", () => {
  it("renders a tied comparable block as 0.5 to 0.5", () => {
    const bundle: PlayerCompareMetricBundle = {
      players: [
        { playerId: "a", metrics: [{ key: "fastest", value: 250, count: null, total: 10, detail: null, qualified: true }] },
        { playerId: "b", metrics: [{ key: "fastest", value: 250, count: null, total: 10, detail: null, qualified: true }] },
      ],
      pair: { commonEvents: 0, decidedEvents: 0, playerAWins: 0, playerBWins: 0, ties: 0, directTakeovers: 0, playerATakeovers: 0, playerBTakeovers: 0, rivalryEvents: 0, rivalrySpanDays: null, intensityPercent: null, balancePercent: null, playerANemesisLosses: 0, playerBNemesisLosses: 0, playerAFavoriteWins: 0, playerBFavoriteWins: 0 },
    };
    const markup = renderToStaticMarkup(
      <CompareThemeBlocks playerA={player("a", "Alpha")} playerB={player("b", "Beta")} bundle={bundle} />,
    );
    expect(markup).toContain("0,5 : 0,5");
    expect(markup).toContain("1 von 7 Blöcken vergleichbar");
    expect(markup).toContain("Speed");
    expect(markup).toContain("Unentschieden · 0,5 : 0,5");
    expect(markup).toContain("wertbar");
  });
});
