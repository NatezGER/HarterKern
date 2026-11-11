import { useEffect, useState, useSyncExternalStore } from "react";
import { getPerformanceDetail, type PerformanceDetail } from "@/services/performanceDetailService";
import { subscribeMedalData, getMedalDataVersion } from "@/services/dataGroupService";
import type { SeasonSelection } from "@/lib/season";
import type { MetricRankEntry } from "@/types/statDashboard";
import { PerformanceDevelopmentDetails } from "./PerformanceDevelopmentDetails";
import { PerformanceEventDetails } from "./PerformanceEventDetails";

export function PerformanceLazyDetails({ season, metric, entry }: { season: SeasonSelection; metric: string; entry: MetricRankEntry }) {
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const version = useSyncExternalStore(subscribeMedalData, getMedalDataVersion, getMedalDataVersion);
  const identity = `${season}:${metric}:${entry.playerId}:${version}`;
  const [state, setState] = useState<{ identity: string; data?: PerformanceDetail; error?: boolean } | null>(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    setState(null);
    void getPerformanceDetail(season, metric, entry.playerId, controller.signal).then(data => {
      if (active) setState({ identity, data });
    }).catch(() => { if (active) setState({ identity, error: true }); });
    return () => { active = false; controller.abort(); };
  }, [open, season, metric, entry.playerId, identity, retry]);
  const current = state?.identity === identity ? state : null;
  return <details className="mt-2 min-w-0 border-t border-white/10 pt-2 text-xs text-white/65" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer rounded py-1 font-bold text-gold-200 focus-visible:outline focus-visible:outline-gold-300">Details ansehen</summary>
    {open && (!current ? <p role="status">Belege werden geladen …</p> : current.error ? <p role="alert">Belege konnten nicht geladen werden. <button className="underline" onClick={() => setRetry(v => v + 1)}>Erneut versuchen</button></p>
      : current.data?.developmentEvidence ? <PerformanceDevelopmentDetails embedded evidence={current.data.developmentEvidence} />
      : current.data?.chaosEvidence?.length || current.data?.rivalryEvidence?.length ? <PerformanceEventDetails embedded entry={{ ...entry, ...current.data }} /> : <p>Keine Belege verfügbar.</p>)}
  </details>;
}
