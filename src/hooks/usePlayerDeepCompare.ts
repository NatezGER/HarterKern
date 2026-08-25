import { useEffect, useState } from "react";
import { useSeason } from "@/hooks/useSeason";
import {
  loadPlayerCompareProgression,
  loadPlayerCompareSequence,
} from "@/services/playerDeepCompareService";
import type {
  PlayerCompareProgressionPair,
  PlayerCompareSequencePair,
} from "@/types/playerCompare";

interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

const initialState = <T,>(): SectionState<T> => ({ data: null, loading: true, error: "" });

export function usePlayerDeepCompare(playerAId: string | null, playerBId: string | null) {
  const { season } = useSeason();
  const seasonYear = typeof season === "number" ? season : undefined;
  const requestKey = `${playerAId ?? "-"}:${playerBId ?? "-"}:${seasonYear ?? "all-time"}`;
  const [sequence, setSequence] = useState<SectionState<PlayerCompareSequencePair | null>>(initialState);
  const [progression, setProgression] = useState<SectionState<PlayerCompareProgressionPair>>(initialState);

  useEffect(() => {
    let active = true;
    setSequence(initialState());
    setProgression(initialState());
    void loadPlayerCompareSequence(playerAId, playerBId, seasonYear)
      .then((data) => active && setSequence({ data, loading: false, error: "" }))
      .catch(() => active && setSequence({
        data: null,
        loading: false,
        error: "Serien und Versuchsnummern konnten nicht geladen werden.",
      }));
    void loadPlayerCompareProgression(playerAId, playerBId, seasonYear)
      .then((data) => active && setProgression({ data, loading: false, error: "" }))
      .catch(() => active && setProgression({
        data: null,
        loading: false,
        error: "Die PB-Entwicklung konnte nicht geladen werden.",
      }));
    return () => {
      active = false;
    };
  }, [playerAId, playerBId, requestKey, seasonYear]);

  return { sequence, progression };
}
