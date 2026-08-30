import { useEffect, useMemo, useState } from "react";
import { loadPlayerMostWantedStatistics } from "@/services/playerMostWantedService";
import type { PlayerMostWantedStatistics } from "@/types/playerCompare";

export interface PlayerMostWantedState {
  data: Record<string, PlayerMostWantedStatistics> | null;
  loading: boolean;
  error: string;
}

export function usePlayerMostWantedStatistics(playerIds: Array<string | null>, seasonYear?: number) {
  const playerIdsKey = playerIds.filter(Boolean).join(":");
  const ids = useMemo(() => [...new Set(playerIdsKey.split(":").filter(Boolean))], [playerIdsKey]);
  const requestKey = `${ids.join(":")}:${seasonYear ?? "all-time"}`;
  const [state, setState] = useState<PlayerMostWantedState>({ data: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: ids.length > 0, error: "" });
    if (ids.length === 0) return () => { active = false; };
    void loadPlayerMostWantedStatistics(ids, seasonYear)
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch(() => active && setState({
        data: null,
        loading: false,
        error: "Most-Wanted-Werte konnten nicht geladen werden.",
      }));
    return () => { active = false; };
  }, [ids, requestKey, seasonYear]);

  return state;
}
