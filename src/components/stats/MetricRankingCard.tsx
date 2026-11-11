import { AccessibleTooltip } from "@/components/common/AccessibleTooltip";
import { StatisticsMedal } from "@/components/common/StatisticsMedal";
import type { ReactNode } from "react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import type { RankedMetric } from "@/types/statDashboard";
import { formatMetricValue } from "@/utils/statMetricFormat";

export function MetricRankingCard({ metric, limit = 5, controls, renderDetails, linkPlayers = false, wrapDetail = false }: { metric: RankedMetric; limit?: number; controls?: ReactNode; renderDetails?: (entry: RankedMetric["rankings"][number]) => ReactNode; linkPlayers?: boolean; wrapDetail?: boolean }) {
  return <article className={`panel min-w-0 ${metric.compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`} data-metric-key={metric.key}>
    <div className="flex items-start justify-between gap-2"><h3 className={`font-display font-black ${metric.compact ? "text-base" : "text-lg sm:text-xl"}`}>{metric.title}</h3>{metric.info && <AccessibleTooltip label="ⓘ" description={metric.info} showLabelInTooltip={false} className="grid size-7 shrink-0 place-items-center text-gold-200" />}</div>
    <p className="mt-1 min-h-8 text-xs text-white/45">{metric.description}</p>
    {controls}
    {metric.overallValue != null && <div className={`mt-3 rounded-xl border border-gold-400/10 bg-gold-400/[0.04] ${metric.compact ? "p-2.5" : "p-3"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300/65">Gesamt</p>
      <strong className={`mt-1 block font-display font-black tabular-nums text-gold-200 ${metric.compact ? "text-xl" : "text-2xl"}`}>{formatMetricValue(metric.overallValue, metric.overallFormat ?? metric.format)}</strong>
      {metric.overallCount != null && metric.overallTotal != null && <p className="mt-1 text-xs tabular-nums text-white/50">{metric.overallCount} / {metric.overallTotal}</p>}
      {metric.overallDetail && <p className="mt-1 text-xs text-white/50">{metric.overallDetail}</p>}
    </div>}
    {metric.rankings.length > 0 ? <ol className="mt-3 space-y-2">
      {metric.rankings.slice(0, limit).map((entry) => <li key={entry.playerId} className={`min-w-0 rounded-xl border ${metric.compact ? "p-2" : "p-2.5"} ${entry.rank === 1 ? "border-gold-400/20 bg-gold-400/[0.06]" : "border-white/[0.06] bg-white/[0.025]"}`}>
        <div className="flex min-w-0 items-center gap-2">
        <span className="w-6 shrink-0 font-display text-lg font-black tabular-nums text-gold-300">{entry.rank <= 3 ? <><span className="sr-only">Platz {entry.rank}</span><StatisticsMedal rank={entry.rank as 1 | 2 | 3} /></> : `${entry.rank}.`}</span>
        <ProfileAvatar id={entry.playerId} name={entry.name} url={entry.avatarUrl} className={`${entry.rank === 1 ? "size-9" : "size-8"} shrink-0`} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{linkPlayers ? <a href={`/player/${entry.playerId}`} className="hover:text-gold-200 focus-visible:outline focus-visible:outline-gold-300">{entry.name}</a> : entry.name}</p><p className={`${wrapDetail ? "break-words" : "truncate"} text-[11px] text-white/45`}>{entry.detail || "\u00a0"}</p></div>
        <div className="shrink-0 text-right"><strong className="font-display text-lg font-black tabular-nums">{formatMetricValue(entry.value, metric.format)}</strong><p className="min-h-4 text-[11px] tabular-nums text-white/45">{entry.count != null ? entry.total != null ? `${entry.count} / ${entry.total}` : `${entry.count} gültige Versuche` : "\u00a0"}</p></div>
        </div>
        {renderDetails?.(entry)}
      </li>)}
    </ol> : <p className="mt-3 text-xs text-white/40">Noch keine qualifizierten Spieler.</p>}
  </article>;
}

export function MetricDashboardGrid({ metrics }: { metrics: RankedMetric[] }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-metric-dashboard>
    {metrics.map((metric) => <MetricRankingCard key={metric.key} metric={metric} />)}
  </div>;
}
