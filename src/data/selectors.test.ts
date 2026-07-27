import { describe, expect, it } from "vitest";
import { getRankedPlayers } from "@/data/selectors";
import type { LeaderboardEntry, Player } from "@/types";

const createPlayer = (
  id: string,
  personalBest: number,
  average: number,
  isAk = false,
): Player => ({
  id,
  name: id,
  initials: id.slice(0, 2),
  avatarGradient: "",
  avatarUrl: null,
  personalBest,
  average,
  attempts: 1,
  validAttempts: 1,
  dnfCount: 0,
  dailyWins: 0,
  trend: "same",
  isAk,
  isArchived: false,
});

const entry = (playerId: string, rank: number): LeaderboardEntry => ({
  playerId,
  rank,
  previousRank: rank,
  recordDate: "2025-05-31",
});

describe("getRankedPlayers", () => {
  it("preserves the personal-best order and shared ranks from the Hall of Fame view", () => {
    const players = [
      createPlayer("fast-a", 2.06, 8),
      createPlayer("fast-b", 2.06, 3),
      createPlayer("slower", 2.2, 2.2),
    ];
    const leaderboard = [entry("fast-a", 1), entry("fast-b", 1), entry("slower", 2)];

    expect(getRankedPlayers(players, leaderboard).map(({ player, rank }) => [player.id, rank])).toEqual([
      ["fast-a", 1],
      ["fast-b", 1],
      ["slower", 2],
    ]);
  });

  it("does not reorder players by average time", () => {
    const players = [
      createPlayer("best-pb", 2.06, 9.99),
      createPlayer("best-average", 2.2, 2.2),
    ];
    const leaderboard = [entry("best-pb", 1), entry("best-average", 2)];

    expect(getRankedPlayers(players, leaderboard).map(({ player }) => player.id)).toEqual([
      "best-pb",
      "best-average",
    ]);
  });

  it("excludes AK players defensively", () => {
    const players = [createPlayer("regular", 2.2, 2.5), createPlayer("ak", 1.5, 1.5, true)];
    const leaderboard = [entry("ak", 1), entry("regular", 2)];

    expect(getRankedPlayers(players, leaderboard).map(({ player }) => player.id)).toEqual(["regular"]);
  });
});
