import { DataState } from "@/components/common/DataState";
import { StatsHeader } from "@/components/stats/StatsHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StatCard } from "@/components/stats/StatCard";
import { useDataGroup, useDataPlatform } from "@/hooks/useDataPlatform";
import { usePerformanceDashboard } from "@/hooks/usePerformanceDashboard";
import { Button } from "@/components/ui/button";
import { useSeason } from "@/hooks/useSeason";
import { useState } from "react";
import { HistoricalAttemptsDisclosure } from "@/components/history/HistoricalAttemptsDisclosure";
import { MetricRankingCard } from "@/components/stats/MetricRankingCard";
import { PerformanceRankings } from "@/components/stats/PerformanceRankings";
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
      <StatsHeader title="Performance" />
      <StatsNavigation />
      <DataState>
        <section className="mt-12">
          <SectionHeading eyebrow={isAllTime ? "All-Time" : `Saison ${season}`} title="Ligastatistiken" />
          <div className="mb-3 grid grid-cols-2 gap-3 sm:gap-4">
            {(performance?.statistics ?? [])
              .filter(({ id }) => id !== "players" && id !== "events")
              .map((statistic) => <StatCard key={statistic.id} statistic={statistic} />)}
          </div>
          {dashboard.loading && <p className="panel p-5 text-sm text-white/45" role="status">Ranking-Statistiken werden geladen …</p>}
          {dashboard.error && <div className="panel flex flex-col items-start gap-3 p-5 text-sm text-amber-200/80" role="alert"><p>Ranking-Statistiken konnten nicht geladen werden.</p><Button type="button" variant="outline" onClick={dashboard.retry}>Bereich neu laden</Button></div>}
          {dashboardData && <PerformanceRankings metrics={dashboardData.metrics} />}
        </section>
        <section id="performance-bingo" className="scroll-mt-28 space-y-3" aria-labelledby="heading-bingo">
          <h3 id="heading-bingo" className="mb-4 border-b border-gold-300/15 pb-2 font-display text-xl font-black text-gold-200 sm:text-2xl">IX. BINGO & Most Wanted</h3>
          <BadgeRankingSections groups={["bingo"]} showHeadings={false} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardData?.metrics.filter(m => m.key === "most-wanted-firsts").map(metric => <MetricRankingCard key={metric.key} metric={metric} />)}
          </div>
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
    </div>
  );
}
