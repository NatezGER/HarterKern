import { useEffect, useMemo, useState } from "react";
import { loadPlayerBadgePrestige } from "@/services/playerBadgePrestigeService";
import type { PlayerBadgePrestige } from "@/types/playerCompare";

export function usePlayerBadgePrestige(playerIds: Array<string | null>) {
  const key = playerIds.filter(Boolean).join(":");
  const ids = useMemo(() => [...new Set(key.split(":").filter(Boolean))], [key]);
  const [state, setState] = useState<{ data: Record<string, PlayerBadgePrestige> | null; loading: boolean; error: string }>({ data: null, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: ids.length > 0, error: "" });
    if (!ids.length) return () => { active = false; };
    void loadPlayerBadgePrestige(ids).then((data) => active && setState({ data, loading: false, error: "" }))
      .catch(() => active && setState({ data: null, loading: false, error: "Badge-Prestige konnte nicht geladen werden." }));
    return () => { active = false; };
  }, [ids, key]);
  return state;
}
