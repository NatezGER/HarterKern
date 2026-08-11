import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ALL_TIME_SEASON,
  readStoredSeason,
  storeSeason,
} from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";

interface SeasonContextValue {
  season: SeasonSelection;
  setSeason: (season: SeasonSelection) => void;
  isAllTime: boolean;
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeasonState] = useState<SeasonSelection>(() => (
    typeof window === "undefined"
      ? ALL_TIME_SEASON
      : readStoredSeason(window.localStorage)
  ));

  const setSeason = useCallback((nextSeason: SeasonSelection) => {
    setSeasonState(nextSeason);
    if (typeof window !== "undefined") storeSeason(window.localStorage, nextSeason);
  }, []);

  const value = useMemo(() => ({
    season,
    setSeason,
    isAllTime: season === ALL_TIME_SEASON,
  }), [season, setSeason]);

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSeason() {
  const context = useContext(SeasonContext);
  if (!context) throw new Error("useSeason muss innerhalb des SeasonProvider verwendet werden.");
  return context;
}
