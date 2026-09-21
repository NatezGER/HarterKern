import { describe, expect, it } from "vitest";
import { calculateCompareBlockScore, createCompareBlocks } from "@/lib/playerCompareBlocks";
import type { PlayerCompareMetricBundle } from "@/types/playerCompare";

function metric(key: string, value: number, qualified = true) {
  return { key, value, count: null, total: null, detail: null, qualified };
}

describe("compare block scoring", () => {
  it("splits a genuinely tied block into half a point each", () => {
    const bundle: PlayerCompareMetricBundle = {
      players: [
        { playerId: "a", metrics: [metric("fastest", 250)] },
        { playerId: "b", metrics: [metric("fastest", 250)] },
      ],
      pair: { commonEvents: 0, decidedEvents: 0, playerAWins: 0, playerBWins: 0, ties: 0, directTakeovers: 0, playerATakeovers: 0, playerBTakeovers: 0, rivalryEvents: 0, rivalrySpanDays: null, intensityPercent: null, balancePercent: null, playerANemesisLosses: 0, playerBNemesisLosses: 0, playerAFavoriteWins: 0, playerBFavoriteWins: 0 },
    };
    const blocks = createCompareBlocks(bundle, "a", "b");
    expect(blocks.find(({ key }) => key === "speed")).toMatchObject({
      playerAPoints: 0.5, playerBPoints: 0.5, winner: "tie", comparable: true,
    });
    expect(calculateCompareBlockScore(blocks)).toMatchObject({
      playerA: 0.5, playerB: 0.5, comparableBlocks: 1,
    });
  });

  it("uses raw ties and excludes one-sided qualification", () => {
    const bundle: PlayerCompareMetricBundle = {
      players: [
        { playerId: "a", metrics: [metric("fastest", 250), metric("average", 300), metric("median", 280)] },
        { playerId: "b", metrics: [metric("fastest", 250), metric("average", 310), metric("median", 270, false)] },
      ],
      pair: { commonEvents: 0, decidedEvents: 0, playerAWins: 0, playerBWins: 0, ties: 0, directTakeovers: 0, playerATakeovers: 0, playerBTakeovers: 0, rivalryEvents: 0, rivalrySpanDays: null, intensityPercent: null, balancePercent: null, playerANemesisLosses: 0, playerBNemesisLosses: 0, playerAFavoriteWins: 0, playerBFavoriteWins: 0 },
    };
    const speed = createCompareBlocks(bundle, "a", "b").find(({ key }) => key === "speed")!;
    expect(speed).toMatchObject({ playerAPoints: 1.5, playerBPoints: 0.5, winner: "a", comparable: true });
    expect(speed.metrics.find(({ key }) => key === "median")).toMatchObject({ comparable: false, winner: null });
  });

  it("excludes empty blocks from the possible total", () => {
    const bundle: PlayerCompareMetricBundle = {
      players: [{ playerId: "a", metrics: [] }, { playerId: "b", metrics: [] }],
      pair: { commonEvents: 0, decidedEvents: 0, playerAWins: 0, playerBWins: 0, ties: 0, directTakeovers: 0, playerATakeovers: 0, playerBTakeovers: 0, rivalryEvents: 0, rivalrySpanDays: null, intensityPercent: null, balancePercent: null, playerANemesisLosses: 0, playerBNemesisLosses: 0, playerAFavoriteWins: 0, playerBFavoriteWins: 0 },
    };
    expect(calculateCompareBlockScore(createCompareBlocks(bundle, "a", "b"))).toMatchObject({ playerA: 0, playerB: 0, comparableBlocks: 0, totalBlocks: 7 });
  });

  it("keeps a qualified context metric out of metric points and the block score", () => {
    const bundle: PlayerCompareMetricBundle = {
      players: [
        { playerId: "a", metrics: [metric("fastest", 250), metric("sub5", 100)] },
        { playerId: "b", metrics: [metric("fastest", 250), metric("sub5", 0)] },
      ],
      pair: { commonEvents: 0, decidedEvents: 0, playerAWins: 0, playerBWins: 0, ties: 0, directTakeovers: 0, playerATakeovers: 0, playerBTakeovers: 0, rivalryEvents: 0, rivalrySpanDays: null, intensityPercent: null, balancePercent: null, playerANemesisLosses: 0, playerBNemesisLosses: 0, playerAFavoriteWins: 0, playerBFavoriteWins: 0 },
    };
    const blocks = createCompareBlocks(bundle, "a", "b");
    const speed = blocks.find(({ key }) => key === "speed")!;
    expect(speed.metrics.find(({ key }) => key === "sub5")).toMatchObject({
      scoreable: false, comparable: false, winner: null,
    });
    expect(speed).toMatchObject({ playerAPoints: 0.5, playerBPoints: 0.5, winner: "tie" });
    expect(calculateCompareBlockScore(blocks)).toMatchObject({ playerA: 0.5, playerB: 0.5 });
  });
});
