import { useEffect, useState } from "react";
import type { TimelineOverlaySeries } from "@/components/progression/ProgressionTimeline";
import { loadPlayerProgressionOverlays } from "@/services/playerProgressionOverlayService";

export function usePlayerProgressionOverlays(playerIds: string[], seasonYear?: number) {
  const key = [...playerIds].sort().join(",");
  const [state, setState] = useState<{ data: TimelineOverlaySeries[]; loading: boolean; error: string }>({ data: [], loading: false, error: "" });
  useEffect(() => { if (!key) { setState({ data: [], loading: false, error: "" }); return; } let active = true; setState((current) => ({ ...current, loading: true, error: "" })); void loadPlayerProgressionOverlays(key.split(","), seasonYear).then((data) => active && setState({ data, loading: false, error: "" })).catch(() => active && setState((current) => ({ ...current, loading: false, error: "Spielerlinien konnten nicht geladen werden." }))); return () => { active = false; }; }, [key, seasonYear]);
  return state;
}
