import type { LeaderboardEntry, Player } from "@/types";

export const getPlayerById = (players: Player[], id: string | null) =>
  players.find((player) => player.id === id);

export const resolveEventPodiumAvatar = (players: Player[], entry: {
  playerId?: string | null;
  isGuest?: boolean;
  avatarUrl: string | null;
}) => {
  if (entry.avatarUrl) return entry.avatarUrl;
  if (entry.isGuest || !entry.playerId) return null;
  return getPlayerById(players, entry.playerId)?.avatarUrl ?? null;
};

export const getRosterPlayers = (players: Player[]) =>
  [...players].sort((a, b) =>
    b.validAttempts - a.validAttempts || a.name.localeCompare(b.name, "de"),
  );

export const getRankedPlayers = (players: Player[], leaderboard: LeaderboardEntry[]) =>
  leaderboard.flatMap((entry) => {
    const player = getPlayerById(players, entry.playerId);
    return player && !player.isAk && !player.isArchived
      ? [{ ...entry, player }]
      : [];
  });

export const getPodiumPlayers = (players: Player[], leaderboard: LeaderboardEntry[]) =>
  getRankedPlayers(players, leaderboard).slice(0, 3);
