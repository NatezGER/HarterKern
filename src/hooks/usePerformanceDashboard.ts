import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import type { SeasonSelection } from "@/lib/season";
import { getPerformanceDashboard } from "@/services/performanceDashboardService";
import type { PerformanceDashboard } from "@/services/performanceDashboardService";

/** Independent read: never blocks the route or attempt persistence. */
export function usePerformanceDashboard(season: SeasonSelection, refreshVersion: number, enabled = true) {
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<{
    season?: SeasonSelection;
    data: PerformanceDashboard | null;
    loading: boolean;
    error: string;
  }>({ data: null, loading: true, error: "" });

  useEffect(() => {
    if (!enabled || refreshVersion <= 0) return;
    let active = true;
    const controller = new AbortController();
    setState({ season, data: null, loading: true, error: "" });
    void getPerformanceDashboard(season, controller.signal).then((data) => {
      if (active) setState({ season, data, loading: false, error: "" });
    }).catch((error) => {
      if (active) setState({ season, data: null, loading: false, error: getErrorMessage(error) });
    });
    return () => { active = false; controller.abort(); };
  }, [season, refreshVersion, retryVersion, enabled]);

  return { ...(enabled && state.season === season ? state : { data: null, loading: enabled, error: "" }), retry: () => setRetryVersion((version) => version + 1) };
}
