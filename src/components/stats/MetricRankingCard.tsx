import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import type { RankedMetric } from "@/types/statDashboard";
import { formatMetricValue } from "@/utils/statMetricFormat";

export function MetricRankingCard({ metric, limit = 5 }: { metric: RankedMetric; limit?: number }) {
  return <article className={`panel min-w-0 ${metric.compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`} data-metric-key={metric.key}>
    <h3 className={`font-display font-black ${metric.compact ? "text-base" : "text-lg sm:text-xl"}`}>{metric.title}</h3>
    <p className="mt-1 text-xs text-white/45">{metric.description}</p>
    <div className={`mt-3 rounded-xl border border-gold-400/10 bg-gold-400/[0.04] ${metric.compact ? "p-2.5" : "p-3"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300/65">Gesamt</p>
      <strong className={`mt-1 block font-display font-black tabular-nums text-gold-200 ${metric.compact ? "text-xl" : "text-2xl"}`}>{formatMetricValue(metric.overallValue, metric.overallFormat ?? metric.format)}</strong>
      {metric.overallCount != null && metric.overallTotal != null && <p className="mt-1 text-xs tabular-nums text-white/50">{metric.overallCount} / {metric.overallTotal}</p>}
      {metric.overallDetail && <p className="mt-1 text-xs text-white/50">{metric.overallDetail}</p>}
    </div>
    {metric.rankings.length > 0 ? <ol className="mt-3 space-y-2">
      {metric.rankings.slice(0, limit).map((entry, index) => <li key={entry.playerId} className={`flex min-w-0 items-center gap-2 rounded-xl border ${metric.compact ? "p-2" : "p-2.5"} ${index === 0 ? "border-gold-400/20 bg-gold-400/[0.06]" : "border-white/[0.06] bg-white/[0.025]"}`}>
        <span className="w-6 shrink-0 font-display text-lg font-black tabular-nums text-gold-300">{entry.rank}.</span>
        <ProfileAvatar id={entry.playerId} name={entry.name} url={entry.avatarUrl} className={`${index === 0 ? "size-9" : "size-8"} shrink-0`} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.name}</p>{entry.detail && <p className="truncate text-[11px] text-white/45">{entry.detail}</p>}</div>
        <div className="shrink-0 text-right"><strong className="font-display text-lg font-black tabular-nums">{formatMetricValue(entry.value, metric.format)}</strong>{entry.count != null && <p className="text-[11px] tabular-nums text-white/45">{entry.total != null ? `${entry.count} / ${entry.total}` : `${entry.count} gültige Versuche`}</p>}</div>
      </li>)}
    </ol> : <p className="mt-3 text-xs text-white/40">Noch keine qualifizierten Spieler.</p>}
  </article>;
}

export function MetricDashboardGrid({ metrics }: { metrics: RankedMetric[] }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-metric-dashboard>
    {metrics.map((metric) => <MetricRankingCard key={metric.key} metric={metric} />)}
  </div>;
}
