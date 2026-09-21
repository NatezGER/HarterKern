import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StatCard } from "@/components/stats/StatCard";
import { appMeta } from "@/constants/content";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useDataGroup, useDataPlatform } from "@/hooks/useDataPlatform";
import { WRProgression } from "@/components/dashboard/WRProgression";
import { BadgeRarityGrid } from "@/components/stats/BadgeRarityGrid";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
import { OptionalDataState } from "@/components/common/OptionalDataState";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { useSeason } from "@/hooks/useSeason";
import { useState } from "react";
import { HistoricalAttemptsDisclosure } from "@/components/history/HistoricalAttemptsDisclosure";
import { LeagueAttemptNumberChart } from "@/components/stats/OfficialTimePerformance";
import { MetricDashboardGrid } from "@/components/stats/MetricRankingCard";
import { metricGroupLabels } from "@/constants/statMetricRegistry";
import type { MetricGroup } from "@/types/statDashboard";
import { RivalryPairList } from "@/components/stats/RivalryPairList";
import { useStatisticDashboard } from "@/hooks/useStatisticDashboard";
import { useManagementMode } from "@/hooks/useManagementMode";
import { AdminBadgeCatalogSlot } from "@/components/stats/AdminBadgeCatalogSlot";

export function StatsPage() {
  const { data } = useEffectivePublicData();
  const { snapshot } = useDataPlatform();
  const { season, isAllTime } = useSeason();
  const { version: statisticsVersion } = useDataGroup("statistics");
  const dashboard = useStatisticDashboard(season, statisticsVersion);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const { unlocked } = useManagementMode();
  const dashboardData = dashboard.data;
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={isAllTime ? "League Intelligence" : `League Intelligence · Saison ${season}`} title="Statistiken" description={isAllTime ? appMeta.statsDescription : `Eventbasierte Ligawerte der Saison ${season}.`} action={<SeasonContextBadge />} />
      <DataState>
        <section>
          <WRProgression collapsibleHistory />
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow="00 bis 99" title="Most Wanted" />
          <OptionalDataState group="most-wanted"><MostWantedMatrix data={data.mostWanted} season={season} /></OptionalDataState>
        </section>
        <section className="panel mt-12 p-5 sm:p-8">
          <SectionHeading eyebrow={isAllTime ? "Ligaweit" : `Ligaweit · Saison ${season}`} title="Durchschnitt nach Versuchsnummer" />
          <OptionalDataState group="most-wanted"><LeagueAttemptNumberChart data={data.mostWanted} /></OptionalDataState>
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow={isAllTime ? "All-Time" : `Saison ${season}`} title="Ligastatistiken" />
          <div className="mb-3 grid grid-cols-2 gap-3 sm:gap-4">
            {data.statistics.filter(({ id }) => id === "players" || id === "events")
              .map((statistic) => <StatCard key={statistic.id} statistic={statistic} />)}
          </div>
          {dashboard.loading && <p className="panel p-5 text-sm text-white/45" role="status">Ranking-Statistiken werden geladen …</p>}
          {dashboard.error && <p className="panel p-5 text-sm text-amber-200/80" role="alert">Ranking-Statistiken konnten nicht geladen werden.</p>}
          {dashboardData && <div className="space-y-8">{(["performance", "consistency", "volume", "event", "bingo", "rivalry", "achievements", "records"] as MetricGroup[]).map((group) => {
            const metrics = dashboardData.metrics.filter((metric) => metric.group === group);
            if (metrics.length === 0) return null;
            return <section key={group} aria-labelledby={`metric-group-${group}`}>
              <h3 id={`metric-group-${group}`} className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-gold-300/75">{metricGroupLabels[group]}</h3>
              <MetricDashboardGrid metrics={metrics} />
            </section>;
          })}<RivalryPairList pairs={dashboardData.rivalryPairs} live={false} /></div>}
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow={isAllTime ? "Prestige" : "All-Time · Prestige"} title="Badge-Seltenheit" />
          <p className="-mt-4 mb-5 max-w-3xl text-sm leading-6 text-white/45">Anteil der aktiven, dauerhaften Spieler, die diese Schwelle mindestens einmal erreicht haben. Höhere Stufen zählen deshalb auch bei den darunterliegenden Schwellen mit; Gäste und AK-Spieler sind ausgeschlossen.</p>
          <OptionalDataState group="badge-rarity">
            <BadgeRarityGrid badges={data.badgeRarity} />
          </OptionalDataState>
        </section>
        {isAllTime && <section id="history" className="mt-12 scroll-mt-28">
          <SectionHeading eyebrow="Zeitarchiv" title="Historische Versuche" />
          <p className="-mt-4 mb-5 max-w-3xl text-sm leading-6 text-white/45">
            Diese offiziellen Einzelzeiten sind keiner vollständig dokumentierten
            Veranstaltung zugeordnet und erzeugen deshalb keine Eventwertung.
          </p>
          <HistoricalAttemptsDisclosure
            attempts={snapshot.liveState.historicalAttempts}
            expanded={historyExpanded}
            onToggle={() => setHistoryExpanded((value) => !value)}
          />
        </section>}
      </DataState>
      <AdminBadgeCatalogSlot unlocked={unlocked} />
    </div>
  );
}
