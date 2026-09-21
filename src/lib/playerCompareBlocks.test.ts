import { describe, expect, it } from "vitest";
import { calculateCompareBlockScore, createCompareBlocks } from "@/lib/playerCompareBlocks";
import type { CompareBundleMetric, PlayerCompareMetricBundle } from "@/types/playerCompare";

function metric(key: string, value: number | null): CompareBundleMetric {
  return { key, value, count: null, total: null, detail: null, qualified: false };
}

const pair = {
  commonEvents: 0, decidedEvents: 0, playerAWins: 0, playerBWins: 0,
  ties: 0, directTakeovers: 0, playerATakeovers: 0, playerBTakeovers: 0,
  rivalryEvents: 0, rivalrySpanDays: null, intensityPercent: null,
  balancePercent: null, playerANemesisLosses: 0, playerBNemesisLosses: 0,
  playerAFavoriteWins: 0, playerBFavoriteWins: 0,
};

function bundle(left: CompareBundleMetric[], right: CompareBundleMetric[]): PlayerCompareMetricBundle {
  return { players: [
    { playerId: "a", metrics: left },
    { playerId: "b", metrics: right },
  ], pair };
}

function resultFor(key: string, left: number | null, right: number | null) {
  return createCompareBlocks(bundle([metric(key, left)], [metric(key, right)]), "a", "b")
    .flatMap(({ metrics }) => metrics)
    .find((candidate) => candidate.key === key);
}

describe("compare block scoring", () => {
  it("uses the metric direction when both players have values", () => {
    expect(resultFor("fastest", 250, 270)?.winner).toBe("a");
    expect(resultFor("valid", 8, 10)?.winner).toBe("b");
  });

  it("splits equal values into half a metric point each", () => {
    expect(resultFor("fastest", 250, 250)?.winner).toBe("tie");
  });

  it("lets the only existing value win from either side", () => {
    expect(resultFor("fastest", 250, null)?.winner).toBe("a");
    expect(resultFor("fastest", null, 250)?.winner).toBe("b");
  });

  it("treats two missing values as a metric tie", () => {
    expect(resultFor("fastest", null, null)?.winner).toBe("tie");
  });

  it("keeps a real zero comparable, including threshold metrics", () => {
    expect(resultFor("sub3", 0, 20)?.winner).toBe("b");
    expect(resultFor("sub2", 0, null)?.winner).toBe("a");
  });

  it("does not apply sample or qualified gates", () => {
    const result = createCompareBlocks(bundle(
      [{ ...metric("clutch", 100), count: 1, total: 1 }],
      [{ ...metric("clutch", 0), count: 0, total: 1 }],
    ), "a", "b").find(({ key }) => key === "clutch")!;
    expect(result.metrics.find(({ key }) => key === "clutch")?.winner).toBe("a");
    expect(result.winner).toBe("a");
  });

  it("scores a single 2-in-60 best value without a five-run minimum", () => {
    expect(resultFor("two-in-sixty-best", 540, 560)?.winner).toBe("a");
  });

  it("builds exactly six blocks without the duplicate rivalry block", () => {
    const blocks = createCompareBlocks(bundle([], []), "a", "b");
    expect(blocks.map(({ key }) => key)).toEqual([
      "speed", "consistency", "volume", "clutch", "bingo", "achievements",
    ]);
    expect(blocks.flatMap(({ metrics }) => metrics).some(({ key }) => key === "direct-wins"))
      .toBe(false);
    expect(calculateCompareBlockScore(blocks)).toEqual({
      playerA: 3, playerB: 3, totalBlocks: 6,
    });
  });

  it("calculates the final score from only the six remaining block winners", () => {
    const blocks = createCompareBlocks(
      bundle([metric("fastest", 250)], [metric("fastest", 270)]), "a", "b",
    );
    expect(calculateCompareBlockScore(blocks)).toEqual({
      playerA: 3.5, playerB: 2.5, totalBlocks: 6,
    });
  });
});
