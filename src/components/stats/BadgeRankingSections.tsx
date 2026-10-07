import { MetricDashboardGrid } from "@/components/stats/MetricRankingCard";
import { OptionalDataState } from "@/components/common/OptionalDataState";
import { metricGroupLabels } from "@/constants/statMetricRegistry";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useSeason } from "@/hooks/useSeason";
import type { MetricGroup } from "@/types/statDashboard";

export function BadgeRankingSections() {
  const { data } = useEffectivePublicData();
  const { season } = useSeason();
  const dashboard = data.badgeStatistics?.season === season ? data.badgeStatistics.dashboard : null;
  return <OptionalDataState group="badge-statistics">
    {dashboard && <div className="space-y-8">{(["bingo", "achievements"] as MetricGroup[]).map(group => {
      const metrics = dashboard.metrics.filter(metric => metric.group === group);
      return metrics.length ? <section key={group}>
        <h3 className="mb-4 border-b border-gold-300/15 pb-2 font-display text-xl font-black uppercase tracking-[0.12em] text-gold-200 sm:text-2xl">{metricGroupLabels[group]}</h3>
        <MetricDashboardGrid metrics={metrics} />
      </section> : null;
    })}</div>}
  </OptionalDataState>;
}
