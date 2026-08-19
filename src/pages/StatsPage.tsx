import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StatCard } from "@/components/stats/StatCard";
import { appMeta } from "@/constants/content";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useDataPlatform } from "@/hooks/useDataPlatform";
import { WRProgression } from "@/components/dashboard/WRProgression";
import { GroupMilestones } from "@/components/stats/GroupMilestones";
import { BadgeRarityGrid } from "@/components/stats/BadgeRarityGrid";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
import { LeagueTimeStatistics } from "@/components/stats/LeagueTimeStatistics";
import { OptionalDataState } from "@/components/common/OptionalDataState";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { useSeason } from "@/hooks/useSeason";
import { useState } from "react";
import { HistoricalAttemptsDisclosure } from "@/components/history/HistoricalAttemptsDisclosure";
import { LeagueAttemptNumberChart, OfficialTimeThresholds } from "@/components/stats/OfficialTimePerformance";

export function StatsPage() {
  const { data } = useEffectivePublicData();
  const { snapshot } = useDataPlatform();
  const { season, isAllTime } = useSeason();
  const [historyExpanded, setHistoryExpanded] = useState(false);
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={isAllTime ? "League Intelligence" : `League Intelligence · Saison ${season}`} title="Statistiken" description={isAllTime ? appMeta.statsDescription : `Eventbasierte Ligawerte der Saison ${season}.`} action={<SeasonContextBadge />} />
      <DataState>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {data.statistics.map((statistic, index) => (
            <StatCard key={statistic.id} statistic={statistic} delay={index * 0.06} />
          ))}
        </div>
        <section className="mt-12">
          <WRProgression collapsibleHistory />
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow="00 bis 99" title="Most Wanted" />
          <OptionalDataState group="most-wanted"><MostWantedMatrix data={data.mostWanted} season={season} /></OptionalDataState>
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow={isAllTime ? "Gemeinsam erreicht" : "All-Time · Gemeinsam erreicht"} title="Liga-Meilensteine" />
          <OptionalDataState group="group-milestones"><GroupMilestones /></OptionalDataState>
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow={isAllTime ? "Offizielle Zeiten" : "All-Time · Offizielle Zeiten"} title="Ligastatistiken" />
          <OptionalDataState group="league-time"><LeagueTimeStatistics data={data.leagueTimeStatistics} /></OptionalDataState>
          <div className="mt-3"><OptionalDataState group="most-wanted"><OfficialTimeThresholds data={data.mostWanted} /></OptionalDataState></div>
        </section>
        <section className="panel mt-12 p-5 sm:p-8">
          <SectionHeading eyebrow={isAllTime ? "Ligaweit" : `Ligaweit · Saison ${season}`} title="Durchschnitt nach Versuchsnummer" />
          <OptionalDataState group="most-wanted"><LeagueAttemptNumberChart data={data.mostWanted} /></OptionalDataState>
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
    </div>
  );
}
