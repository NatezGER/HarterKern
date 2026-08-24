import { useEffect, useState } from "react";
import { useSeason } from "@/hooks/useSeason";
import { loadPlayerDeepCompare } from "@/services/playerDeepCompareService";
import type { PlayerDeepComparePair } from "@/types/playerCompare";

interface DeepCompareState {
  data: PlayerDeepComparePair | null;
  loading: boolean;
  error: string;
}

export function usePlayerDeepCompare(playerAId: string | null, playerBId: string | null) {
  const { season } = useSeason();
  const seasonYear = typeof season === "number" ? season : undefined;
  const requestKey = `${playerAId ?? "-"}:${playerBId ?? "-"}:${seasonYear ?? "all-time"}`;
  const [state, setState] = useState<DeepCompareState>({
    data: null,
    loading: true,
    error: "",
  });
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: "" });
    void loadPlayerDeepCompare(playerAId, playerBId, seasonYear)
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch(() => active && setState({
        data: null,
        loading: false,
        error: "Deep Compare konnte nicht geladen werden.",
      }));
    return () => {
      active = false;
    };
  }, [playerAId, playerBId, requestKey, seasonYear]);
  return state;
}
