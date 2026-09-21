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
    expect(markup).toContain("Entscheidung erst nach Eventende");
    expect(markup).not.toContain("0 Rivalry-Events");
  });

  it("uses existing closed-event counts in historical view", () => {
    const markup = renderToStaticMarkup(<RivalryPairList pairs={[{ ...pair, rivalryEvents: 3 }]} live={false} />);
    expect(markup).toContain("Bestehende Rivalries");
    expect(markup).toContain("3 Rivalry-Events");
    expect(markup).not.toContain("Rivalry-Level erreicht");
  });

  it("keeps the base pair while each unqualified ranking shows its own empty state", () => {
    const markup = renderToStaticMarkup(<RivalryPairList pairs={[{ ...pair, rivalryEvents: 3 }]} live={false} />);
    expect(markup).toContain("Paul ↔ Lars");
    expect(markup.match(/Noch kein qualifiziertes Paar\./g)).toHaveLength(3);
  });

  it("ranks qualified intensity, duration and balance values independently", () => {
    const markup = renderToStaticMarkup(<RivalryPairList pairs={[{
      ...pair, rivalryEvents: 3, commonEvents: 4,
      intensityPercent: 125, spanDays: 42, balancePercent: 25,
    }]} live={false} />);
    expect(markup).toContain("Intensivste Rivalry");
    expect(markup).toContain("125%");
    expect(markup).toContain("Längste Rivalry");
    expect(markup).toContain("42 Tage");
    expect(markup).toContain("Engste Rivalry");
    expect(markup).toContain("25% Abweichung");
  });
});
