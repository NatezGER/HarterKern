import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import type { SeasonSelection } from "@/lib/season";
import { getRivalryHubV2, rivalryHubV2Cache } from "@/services/rivalryHubV2Service";
import type { RivalryHubV2 } from "@/types/rivalryHub";

export function useRivalryHubV2(season: SeasonSelection) {
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<{ season?: SeasonSelection; data: RivalryHubV2 | null; loading: boolean; error: string }>({
    data: null, loading: true, error: "",
  });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ season, data: null, loading: true, error: "" });
    void getRivalryHubV2(season, controller.signal).then(data => {
      if (active) setState({ season, data, loading: false, error: "" });
    }).catch(error => {
      if (active) setState({ season, data: null, loading: false, error: getErrorMessage(error) });
    });
    return () => { active = false; controller.abort(); };
  }, [season, retryVersion]);
  return {
    ...(state.season === season ? state : { data: null, loading: true, error: "" }),
    retry: () => { rivalryHubV2Cache.invalidate(key => key === String(season)); setRetryVersion(v => v + 1); },
  };
}
