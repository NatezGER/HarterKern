import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { getTrophyEventSpecialStats } from "@/services/trophyEventStatsService";
import type { TrophyEventSpecialStats } from "@/types/trophyEventStats";

export function useTrophyEventSpecialStats(
  eventId: string,
  enabled: boolean,
  refreshVersion: number,
) {
  const [state, setState] = useState<{
    data: TrophyEventSpecialStats | null;
    loading: boolean;
    error: string;
  }>({ data: null, loading: enabled, error: "" });

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: "" });
      return;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    void getTrophyEventSpecialStats(eventId)
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch((error) => active && setState({
        data: null,
        loading: false,
        error: getErrorMessage(error),
      }));
    return () => { active = false; };
  }, [enabled, eventId, refreshVersion]);

  return state;
}
