import { PageHeader } from "@/components/common/PageHeader";
import { ChartPlaceholder } from "@/components/stats/ChartPlaceholder";
import { StatCard } from "@/components/stats/StatCard";
import { appMeta, statistics } from "@/data/mockData";

export function StatsPage() {
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="League Intelligence" title="Statistiken" description={appMeta.statsDescription} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map((statistic, index) => <StatCard key={statistic.id} statistic={statistic} delay={index * 0.06} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPlaceholder title="Zeiten im Saisonverlauf" description="Durchschnittliche Bestzeiten pro Event" />
        <ChartPlaceholder title="Versuche nach Spieler" description="Verteilung der Saisonversuche" variant="donut" />
      </div>
    </div>
  );
}
