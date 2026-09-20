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
    expect(markup).toContain("3 Rivalry-Events");
    expect(markup).not.toContain("Rivalry-Level erreicht");
  });
});
