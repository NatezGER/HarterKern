import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RivalryPairList } from "@/components/stats/RivalryPairList";

const pair = {
  playerLowId: "a", playerHighId: "b", playerLowName: "Paul", playerHighName: "Lars",
  rivalryEvents: 0, directTakeovers: 5, levelReached: true,
};

describe("read-only rivalry presentation", () => {
  it("labels a live threshold as provisional, never as an awarded rivalry", () => {
    const markup = renderToStaticMarkup(<RivalryPairList pairs={[pair]} live />);
    expect(markup).toContain("Rivalry Watch");
    expect(markup).toContain("5 Takeovers");
    expect(markup).toContain("derselben paarweisen Takeover-Logik");
    expect(markup).not.toContain("0 Rivalry-Events");
  });

  it("separates longest, strongest and all direct takeover rankings", () => {
    const markup = renderToStaticMarkup(<RivalryPairList pairs={[{
      ...pair, rivalryEvents: 3, commonEvents: 4,
      spanDays: 42, rivalryDirectTakeovers: 9, allDirectTakeovers: 11,
      firstRivalryDate: "2026-01-01", lastRivalryDate: "2026-02-12",
    }]} live={false} />);
    expect(markup).toContain("Längste Rivalries");
    expect(markup).toContain("42 Tage");
    expect(markup).toContain("Stärkste Rivalries");
    expect(markup).toContain("9 Takeovers");
    expect(markup).toContain("Meiste direkte Führungswechsel");
    expect(markup).toContain("11 Takeovers");
    expect(markup).toContain("einschließlich Duellen unter der Rivalry-Schwelle");
  });

  it("keeps non-rivalry takeovers only in the general direct ranking", () => {
    const markup = renderToStaticMarkup(<RivalryPairList pairs={[{
      ...pair, rivalryEvents: 0, allDirectTakeovers: 2, rivalryDirectTakeovers: 0,
    }]} live={false} />);
    expect(markup).toContain("2 Takeovers");
    expect(markup.match(/Noch kein qualifiziertes Paar\./g)).toHaveLength(2);
  });
});
