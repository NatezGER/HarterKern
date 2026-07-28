import type { LeaderboardEntry, Player } from "@/types";

export const getPlayerById = (players: Player[], id: string | null) =>
  players.find((player) => player.id === id);

export const getRankedPlayers = (players: Player[], leaderboard: LeaderboardEntry[]) =>
  leaderboard.flatMap((entry) => {
    const player = getPlayerById(players, entry.playerId);
    return player && !player.isAk && !player.isArchived
      ? [{ ...entry, player }]
      : [];
  });

export const getPodiumPlayers = (players: Player[], leaderboard: LeaderboardEntry[]) =>
  getRankedPlayers(players, leaderboard).slice(0, 3);
