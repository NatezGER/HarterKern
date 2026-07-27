import { useMemo, useState } from "react";
import { getRankedPlayers } from "@/data/selectors";
import { usePublicData } from "@/hooks/usePublicData";

export type SortOption = "rank" | "personalBest" | "average";

export function useLeaderboard() {
  const { data } = usePublicData();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rank");

  const entries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
    const filtered = getRankedPlayers(data.players, data.leaderboard).filter(({ player }) =>
      player.name.toLocaleLowerCase("de-DE").includes(normalizedQuery),
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === "personalBest") return a.player.personalBest - b.player.personalBest;
      if (sortBy === "average") return a.player.average - b.player.average;
      return a.rank - b.rank;
    });
  }, [data.leaderboard, data.players, query, sortBy]);

  return { entries, query, setQuery, sortBy, setSortBy };
}
