import { useEffect, useState } from "react";
import { useSeason } from "@/hooks/useSeason";
import {
  loadPlayerCompareCore,
  loadPlayerCompareSpeed,
} from "@/services/playerCompareService";
import type {
  PlayerCompareCore,
  PlayerCompareSpeed,
} from "@/services/playerCompareService";

interface CompareState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

const initialState = <T,>(): CompareState<T> => ({
  data: null,
  loading: true,
  error: "",
});

export function usePlayerCompare(playerAId: string | null, playerBId: string | null) {
  const { season } = useSeason();
  const seasonYear = typeof season === "number" ? season : undefined;
  const requestKey = `${playerAId ?? "-"}:${playerBId ?? "-"}:${seasonYear ?? "all-time"}`;
  const [core, setCore] = useState<CompareState<PlayerCompareCore>>(initialState);
  const [speed, setSpeed] = useState<CompareState<PlayerCompareSpeed>>(initialState);

  useEffect(() => {
    let active = true;
    setCore(initialState());
    setSpeed(initialState());
    void loadPlayerCompareCore(playerAId, playerBId, seasonYear)
      .then((data) => active && setCore({ data, loading: false, error: "" }))
      .catch(() => active && setCore({
        data: null,
        loading: false,
        error: "Der Vergleich konnte nicht geladen werden.",
      }));
    void loadPlayerCompareSpeed(playerAId, playerBId, seasonYear)
      .then((data) => active && setSpeed({ data, loading: false, error: "" }))
      .catch(() => active && setSpeed({
        data: null,
        loading: false,
        error: "Die Speed-Werte konnten nicht geladen werden.",
      }));
    return () => {
      active = false;
    };
  }, [playerAId, playerBId, requestKey, seasonYear]);

  return { core, speed };
}
