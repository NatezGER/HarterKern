import { DataState } from "@/components/common/DataState";
import { OptionalDataState } from "@/components/common/OptionalDataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { AdminBadgeCatalogSlot } from "@/components/stats/AdminBadgeCatalogSlot";
import { BadgeRarityGrid } from "@/components/stats/BadgeRarityGrid";
import { MetricDashboardGrid } from "@/components/stats/MetricRankingCard";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { Button } from "@/components/ui/button";
import { metricGroupLabels } from "@/constants/statMetricRegistry";
import { useDataGroup } from "@/hooks/useDataPlatform";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useManagementMode } from "@/hooks/useManagementMode";
import { useSeason } from "@/hooks/useSeason";
import { useStatisticDashboard } from "@/hooks/useStatisticDashboard";
import type { MetricGroup } from "@/types/statDashboard";

const groups: MetricGroup[] = ["bingo", "achievements"];

export function StatsBadgesPage() {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const { version } = useDataGroup("statistics");
  const dashboard = useStatisticDashboard(season, version);
  const { unlocked } = useManagementMode();
  return <div className="space-y-8 sm:space-y-10">
    <PageHeader eyebrow={isAllTime ? "All-Time" : `Saison ${season}`} title="Badges & BINGO" description="Achievements, seltene Auszeichnungen und die Jagd nach 00 bis 99." action={<SeasonContextBadge />} />
    <StatsNavigation />
    <DataState>
      <section><SectionHeading eyebrow="00 bis 99" title="Most Wanted" /><OptionalDataState group="most-wanted"><MostWantedMatrix data={data.mostWanted} season={season} /></OptionalDataState></section>
      <section>
        <SectionHeading eyebrow="Ligaweit" title="Achievements" />
        {dashboard.loading && <p className="panel p-5 text-sm text-white/45" role="status">Achievement-Rankings werden geladen …</p>}
        {dashboard.error && <div className="panel flex flex-col items-start gap-3 p-5 text-sm text-amber-200/80" role="alert"><p>Achievement-Rankings konnten nicht geladen werden.</p><Button type="button" variant="outline" onClick={dashboard.retry}>Bereich neu laden</Button></div>}
        {dashboard.data && <div className="space-y-8">{groups.map((group) => {
          const metrics = dashboard.data?.metrics.filter((metric) => metric.group === group) ?? [];
          return metrics.length ? <section key={group}><h3 className="mb-4 border-b border-gold-300/15 pb-2 font-display text-xl font-black uppercase tracking-[0.12em] text-gold-200 sm:text-2xl">{metricGroupLabels[group]}</h3><MetricDashboardGrid metrics={metrics} /></section> : null;
        })}</div>}
      </section>
      <section><SectionHeading eyebrow={isAllTime ? "Prestige" : "All-Time · Prestige"} title="Badge-Seltenheit" /><p className="-mt-4 mb-5 max-w-3xl text-sm leading-6 text-white/45">Anteil der aktiven, dauerhaften Spieler, die diese Schwelle mindestens einmal erreicht haben.</p><OptionalDataState group="badge-rarity"><BadgeRarityGrid badges={data.badgeRarity} /></OptionalDataState></section>
    </DataState>
    <AdminBadgeCatalogSlot unlocked={unlocked} />
  </div>;
}
