import { useEffect, useState } from "react";
import { loadPlayerRivalries } from "@/services/playerRivalryService";
import type { PlayerRivalrySummary } from "@/types/historyProfiles";

export function usePlayerRivalries(playerId: string) {
  const [state, setState] = useState<{ data: PlayerRivalrySummary[] | null; loading: boolean; error: string }>({ data: null, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: Boolean(playerId), error: "" });
    if (!playerId) return () => { active = false; };
    void loadPlayerRivalries(playerId)
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch(() => active && setState({ data: null, loading: false, error: "Rivalry-Daten konnten nicht geladen werden." }));
    return () => { active = false; };
  }, [playerId]);
  return state;
}
