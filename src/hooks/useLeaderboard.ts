import { useMemo, useState } from "react";
import { getRankedPlayers } from "@/data/selectors";
import { usePublicData } from "@/hooks/usePublicData";

export function useLeaderboard() {
  const { data } = usePublicData();
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
    return getRankedPlayers(data.players, data.leaderboard).filter(({ player }) =>
      player.name.toLocaleLowerCase("de-DE").includes(normalizedQuery),
    );
  }, [data.leaderboard, data.players, query]);

  return { entries, query, setQuery };
}
