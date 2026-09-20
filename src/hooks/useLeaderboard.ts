import { useMemo, useState } from "react";
import { getAverageRankedPlayers, getRankedPlayers } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";

export function useLeaderboard() {
  const { data } = useEffectivePublicData();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"best" | "average">("best");

  const entries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
    const ranked = mode === "best"
      ? getRankedPlayers(data.players, data.leaderboard)
      : getAverageRankedPlayers(data.players);
    return ranked.filter(({ player }) =>
      player.name.toLocaleLowerCase("de-DE").includes(normalizedQuery),
    );
  }, [data.leaderboard, data.players, mode, query]);

  return { entries, query, setQuery, mode, setMode };
}
