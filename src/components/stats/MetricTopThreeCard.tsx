import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import type { MetricFormat, RankedMetric } from "@/types/statDashboard";
import { formatTime } from "@/utils/format";

function formatValue(value: number | null, format: MetricFormat) {
  if (value == null) return "—";
  if (format === "time") return formatTime(value / 100);
  if (format === "percent") return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  if (format === "duration") return `${Math.round(value / 60).toLocaleString("de-DE")} Min.`;
  return value.toLocaleString("de-DE");
}

export function MetricTopThreeCard({ metric }: { metric: RankedMetric }) {
  return <article className="panel min-w-0 p-4 sm:p-5" data-metric-key={metric.key}>
    <h3 className="font-display text-lg font-black sm:text-xl">{metric.title}</h3>
    <p className="mt-1 text-xs text-white/45">{metric.description}</p>
    <div className="mt-4 rounded-xl border border-gold-400/10 bg-gold-400/[0.04] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300/65">Gesamt</p>
      <strong className="mt-1 block font-display text-2xl font-black tabular-nums text-gold-200">{formatValue(metric.overallValue, metric.overallFormat ?? metric.format)}</strong>
      {metric.overallCount != null && metric.overallTotal != null && <p className="mt-1 text-xs tabular-nums text-white/50">{metric.overallCount} / {metric.overallTotal}</p>}
      {metric.overallDetail && <p className="mt-1 text-xs text-white/50">{metric.overallDetail}</p>}
    </div>
    {metric.rankings.length > 0 ? <ol className="mt-3 space-y-2">
      {metric.rankings.slice(0, 3).map((entry, index) => <li key={entry.playerId} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 ${index === 0 ? "border-gold-400/20 bg-gold-400/[0.06]" : "border-white/[0.06] bg-white/[0.025]"}`}>
        <span className="w-6 shrink-0 font-display text-lg font-black tabular-nums text-gold-300">{entry.rank}.</span>
        {index === 0 && <ProfileAvatar id={entry.playerId} name={entry.name} url={entry.avatarUrl} className="size-8 shrink-0" />}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.name}</p>{entry.detail && <p className="truncate text-[11px] text-white/45">{entry.detail}</p>}</div>
        <div className="shrink-0 text-right"><strong className="font-display text-lg font-black tabular-nums">{formatValue(entry.value, metric.format)}</strong>{entry.count != null && <p className="text-[11px] tabular-nums text-white/45">{entry.total != null ? `${entry.count} / ${entry.total}` : `${entry.count} gültige Versuche`}</p>}</div>
      </li>)}
    </ol> : <p className="mt-3 text-xs text-white/40">Noch keine qualifizierten Spieler.</p>}
  </article>;
}

export function MetricDashboardGrid({ metrics }: { metrics: RankedMetric[] }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-metric-dashboard>
    {metrics.map((metric) => <MetricTopThreeCard key={metric.key} metric={metric} />)}
  </div>;
}
