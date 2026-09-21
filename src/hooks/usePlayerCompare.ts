import { useEffect, useState } from "react";
import { useSeason } from "@/hooks/useSeason";
import {
  loadPlayerCompareCore,
  loadPlayerCompareSpeed,
  loadPlayerHeadToHead,
  loadPlayerCompareMetricBundle,
} from "@/services/playerCompareService";
import type {
  PlayerCompareCore,
  PlayerCompareSpeed,
} from "@/services/playerCompareService";
import type { HeadToHeadSummary } from "@/types/historyProfiles";
import type { PlayerCompareMetricBundle } from "@/types/playerCompare";

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
  const [headToHead, setHeadToHead] = useState<CompareState<HeadToHeadSummary>>(initialState);
  const [metricBundle, setMetricBundle] = useState<CompareState<PlayerCompareMetricBundle | null>>(initialState);

  useEffect(() => {
    let active = true;
    setCore(initialState());
    setSpeed(initialState());
    setHeadToHead(initialState());
    setMetricBundle(initialState());
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
    void loadPlayerHeadToHead(playerAId, playerBId, seasonYear)
      .then((data) => active && setHeadToHead({ data, loading: false, error: "" }))
      .catch(() => active && setHeadToHead({
        data: null,
        loading: false,
        error: "Head to Head konnte nicht geladen werden.",
      }));
    void loadPlayerCompareMetricBundle(playerAId, playerBId, seasonYear)
      .then((data) => active && setMetricBundle({ data, loading: false, error: "" }))
      .catch(() => active && setMetricBundle({ data: null, loading: false, error: "Die Themenblöcke konnten nicht geladen werden." }));
    return () => {
      active = false;
    };
  }, [playerAId, playerBId, requestKey, seasonYear]);

  return { core, speed, headToHead, metricBundle };
}
