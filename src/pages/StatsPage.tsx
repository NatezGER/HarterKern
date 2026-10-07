import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StatCard } from "@/components/stats/StatCard";
import { appMeta } from "@/constants/content";
import { useDataGroup, useDataPlatform } from "@/hooks/useDataPlatform";
import { usePerformanceDashboard } from "@/hooks/usePerformanceDashboard";
import { Button } from "@/components/ui/button";
import { WRProgression } from "@/components/dashboard/WRProgression";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { useSeason } from "@/hooks/useSeason";
import { useState } from "react";
import { HistoricalAttemptsDisclosure } from "@/components/history/HistoricalAttemptsDisclosure";
import { AttemptNumberChart } from "@/components/players/AttemptNumberChart";
import { MetricDashboardGrid } from "@/components/stats/MetricRankingCard";
import { metricGroupLabels } from "@/constants/statMetricRegistry";
import type { MetricGroup } from "@/types/statDashboard";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { BadgeRankingSections } from "@/components/stats/BadgeRankingSections";

export function StatsPage() {
  const { snapshot } = useDataPlatform();
  const { season, isAllTime } = useSeason();
  const { version } = useDataGroup("performance");
  const dashboard = usePerformanceDashboard(season, version);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const performance = dashboard.data;
  const dashboardData = performance?.dashboard;
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={isAllTime ? "All-Time" : `Saison ${season}`} title="Performance" description={isAllTime ? appMeta.statsDescription : `Eventbasierte Ligawerte der Saison ${season}.`} action={<SeasonContextBadge />} />
      <StatsNavigation />
      <DataState>
        <section>
          <WRProgression collapsibleHistory roster={performance?.players ?? []} />
        </section>
        <section className="panel mt-12 p-5 sm:p-8">
          <SectionHeading eyebrow={isAllTime ? "Ligaweit" : `Ligaweit · Saison ${season}`} title="Durchschnitt nach Versuchsnummer" />
          {performance ? <AttemptNumberChart points={performance.attemptNumbers} />
            : <p className="text-sm text-white/45" role="status">{dashboard.error ? "Versuchsnummern konnten nicht geladen werden." : "Versuchsnummern werden geladen …"}</p>}
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow={isAllTime ? "All-Time" : `Saison ${season}`} title="Ligastatistiken" />
          <div className="mb-3 grid grid-cols-2 gap-3 sm:gap-4">
            {(performance?.statistics ?? [])
              .map((statistic) => <StatCard key={statistic.id} statistic={statistic} />)}
          </div>
          {dashboard.loading && <p className="panel p-5 text-sm text-white/45" role="status">Ranking-Statistiken werden geladen …</p>}
          {dashboard.error && <div className="panel flex flex-col items-start gap-3 p-5 text-sm text-amber-200/80" role="alert"><p>Ranking-Statistiken konnten nicht geladen werden.</p><Button type="button" variant="outline" onClick={dashboard.retry}>Bereich neu laden</Button></div>}
          {dashboardData && <div className="space-y-8">{(["performance", "consistency", "volume", "event", "records"] as MetricGroup[]).map((group) => {
            const metrics = dashboardData.metrics.filter((metric) => metric.group === group);
            if (metrics.length === 0) return null;
            return <section key={group} aria-labelledby={`metric-group-${group}`}>
              <h3 id={`metric-group-${group}`} className="mb-4 border-b border-gold-300/15 pb-2 font-display text-xl font-black uppercase tracking-[0.12em] text-gold-200 sm:text-2xl">{metricGroupLabels[group]}</h3>
              <MetricDashboardGrid metrics={metrics} />
            </section>;
          })}</div>}
        </section>
        <BadgeRankingSections />
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
    </div>
  );
}
