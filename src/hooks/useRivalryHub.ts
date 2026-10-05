import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import type { SeasonSelection } from "@/lib/season";
import { getRivalryHub } from "@/services/rivalryHubService";
import type { RivalryHubData } from "@/types/statDashboard";

export function useRivalryHub(season: SeasonSelection, includePairs: boolean) {
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<{ data: RivalryHubData | null; loading: boolean; error: string }>({
    data: null, loading: true, error: "",
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ data: null, loading: true, error: "" });
    void getRivalryHub(season, includePairs, controller.signal).then((data) => {
      if (active) setState({ data, loading: false, error: "" });
    }).catch((error) => {
      if (active) setState({ data: null, loading: false, error: getErrorMessage(error) });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [season, includePairs, retryVersion]);

  return { ...state, retry: () => setRetryVersion((version) => version + 1) };
}
