import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import type { SeasonSelection } from "@/lib/season";
import { getStatisticDashboard } from "@/services/statDashboardService";
import type { StatisticDashboard } from "@/types/statDashboard";

/** Independent read: never blocks the route or attempt persistence. */
export function useStatisticDashboard(season: SeasonSelection, refreshVersion: number) {
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<{
    data: StatisticDashboard | null;
    loading: boolean;
    error: string;
  }>({ data: null, loading: true, error: "" });

  useEffect(() => {
    if (refreshVersion <= 0) return;
    let active = true;
    setState({ data: null, loading: true, error: "" });
    void getStatisticDashboard(season).then((data) => {
      if (active) setState({ data, loading: false, error: "" });
    }).catch((error) => {
      if (active) setState({ data: null, loading: false, error: getErrorMessage(error) });
    });
    return () => { active = false; };
  }, [season, refreshVersion, retryVersion]);

  return { ...state, retry: () => setRetryVersion((version) => version + 1) };
}
