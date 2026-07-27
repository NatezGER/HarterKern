import { leaderboard, players } from "@/data/mockData";

export const getPlayerById = (id: string) => players.find((player) => player.id === id);

export const getRankedPlayers = () =>
  leaderboard.flatMap((entry) => {
    const player = getPlayerById(entry.playerId);
    return player ? [{ ...entry, player }] : [];
  });

export const getPodiumPlayers = () => getRankedPlayers().slice(0, 3);
