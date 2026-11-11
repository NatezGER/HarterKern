import { useEffect, useState, useSyncExternalStore } from "react";
import { useDataGroup, useDataPlatform } from "./useDataPlatform";
import { useSeason } from "./useSeason";
import { calculatePerformanceMedals } from "@/lib/performanceMedals";
import { getPerformanceDashboard, type PerformanceDashboard } from "@/services/performanceDashboardService";
import { loadDataGroup, invalidateDataGroups, subscribeMedalData, getMedalDataVersion } from "@/services/dataGroupService";
import type { SeasonSelection } from "@/lib/season";

type BingoData = Awaited<ReturnType<typeof loadDataGroup>>["publicData"];
interface LoadedMedals {
  season: SeasonSelection;
  version: number;
  performance?: PerformanceDashboard;
  bingo?: NonNullable<BingoData>["badgeStatistics"];
  status: "loading" | "ready" | "error";
}
export function useHallOfFameMedals(enabled: boolean) {
  const { season } = useSeason();
  const { snapshot } = useDataPlatform();
  const roster = useDataGroup("leaderboard");
  const version = useSyncExternalStore(subscribeMedalData, getMedalDataVersion, getMedalDataVersion);
  const [state, setState] = useState<LoadedMedals | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    setState({ season, version, status: "loading" });
    void Promise.all([
      getPerformanceDashboard(season, controller.signal),
      loadDataGroup("badge-statistics", season, controller.signal),
    ]).then(([performance, patch]) => {
      if (active) setState({ season, version, status: "ready", performance, bingo: patch.publicData?.badgeStatistics });
    }).catch(() => {
      if (active) setState({ season, version, status: "error" });
    });
    return () => { active = false; controller.abort(); };
  }, [enabled, season, version]);
  const current = enabled && state?.season === season && state.version === version ? state : null;
  const status = current?.status ?? "loading";
  return {
    result: calculatePerformanceMedals({
      scope: season,
      performance: { season: current?.performance?.season, metrics: current?.performance?.dashboard.metrics ?? [], status, coverage: "top10" },
      bingo: { season: current?.bingo?.season, metrics: current?.bingo?.dashboard.metrics ?? [], status, coverage: "top10" },
      players: snapshot.publicData.players, playersStatus: roster.status,
    }),
    retry: () => {
      invalidateDataGroups(["performance", "badge-statistics"]);
      if (roster.status === "error") void roster.refresh().catch(() => undefined);
    },
  };
}
