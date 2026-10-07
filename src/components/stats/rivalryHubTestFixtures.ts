import type { RivalryHubPairV2, RivalryHubV2 } from "@/types/rivalryHub";

export function pairFixture(index = 0, overrides: Partial<RivalryHubPairV2> = {}): RivalryHubPairV2 {
  return {
    playerAId: `a-${index}`, playerBId: `b-${index}`,
    playerADisplayName: `Alpha ${index}`, playerBDisplayName: `Beta ${index}`,
    playerAAvatarUrl: null, playerBAvatarUrl: null,
    comparableH2hEvents: 2, h2hWinsA: 1, h2hWinsB: 1, ties: 0,
    totalDirectTakeovers: 4, eventsWithTakeover: 1,
    canonicalCommonEvents: 2, canonicalDirectTakeovers: 4, rivalryDirectTakeovers: 4,
    rivalryLength: 1, rivalryEvents: 1, rivalryScore: 135, intensityPercent: 67,
    firstRivalryEventDateScope: "2026-01-01", lastRivalryEventDateScope: "2026-01-01",
    rivalryStatusAllTime: true, firstRivalryEventDateAllTime: "2026-01-01",
    rivalryLengthAllTime: 1, formalRivalryInScope: true, historicalRivalry: false,
    duelOnly: false, ...overrides,
  };
}
export function hubFixture(pairs: RivalryHubPairV2[], season: RivalryHubV2["season"] = "all-time"): RivalryHubV2 {
  return { season, pairs, summary: { rivalryEvents: 6, playersWithRivalry: 12, directTakeovers: 26 } };
}
