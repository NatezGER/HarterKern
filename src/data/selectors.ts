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

/** Uses the already rounded, official player_statistics average; no local re-aggregation. */
export const getAverageRankedPlayers = (players: Player[]) => {
  const eligible = players.filter((player) =>
    !player.isAk && !player.isArchived && player.validAttempts > 0 && player.average > 0);
  eligible.sort((left, right) => Math.round(left.average * 100) - Math.round(right.average * 100) ||
    left.name.localeCompare(right.name, "de") || left.id.localeCompare(right.id));
  let previousAverage: number | null = null;
  let rank = 0;
  return eligible.map((player, index) => {
    const averageHundredths = Math.round(player.average * 100);
    if (averageHundredths !== previousAverage) rank = index + 1;
    previousAverage = averageHundredths;
    return { playerId: player.id, player, rank, previousRank: rank, recordDate: "" };
  });
};

export const getPodiumPlayers = (players: Player[], leaderboard: LeaderboardEntry[]) =>
  getRankedPlayers(players, leaderboard).slice(0, 3);
