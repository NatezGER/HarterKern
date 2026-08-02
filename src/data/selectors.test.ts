import { describe, expect, it } from "vitest";
import { getRankedPlayers, getRosterPlayers, resolveEventPodiumAvatar } from "@/data/selectors";
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

describe("getRosterPlayers", () => {
  it("sorts by valid attempts descending and then alphabetically", () => {
    const anton = { ...createPlayer("anton", 2.5, 3), name: "Anton", validAttempts: 8 };
    const zora = { ...createPlayer("zora", 2.4, 3), name: "Zora", validAttempts: 8 };
    const ben = { ...createPlayer("ben", 2.3, 3), name: "Ben", validAttempts: 12 };

    expect(getRosterPlayers([zora, anton, ben]).map(({ name }) => name)).toEqual([
      "Ben",
      "Anton",
      "Zora",
    ]);
  });

  it("does not mutate the source snapshot", () => {
    const source = [
      { ...createPlayer("few", 2.5, 3), validAttempts: 1 },
      { ...createPlayer("many", 2.4, 3), validAttempts: 5 },
    ];

    getRosterPlayers(source);

    expect(source.map(({ id }) => id)).toEqual(["few", "many"]);
  });
});

describe("resolveEventPodiumAvatar", () => {
  const player = { ...createPlayer("player", 2.4, 3), avatarUrl: "https://cdn.example/player.png" };

  it("uses the permanent player profile for a matching player id", () => {
    expect(resolveEventPodiumAvatar([player], { playerId: player.id, isGuest: false, avatarUrl: null })).toBe(player.avatarUrl);
  });

  it("never assigns a permanent profile to a guest entry", () => {
    expect(resolveEventPodiumAvatar([player], { playerId: null, isGuest: true, avatarUrl: null })).toBeNull();
  });

  it("keeps the podium view avatar when it is already present", () => {
    expect(resolveEventPodiumAvatar([player], { playerId: player.id, isGuest: false, avatarUrl: "https://cdn.example/event.png" })).toBe("https://cdn.example/event.png");
  });
});
