import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StatCard } from "@/components/stats/StatCard";
import { HistoricalAttemptList } from "@/components/history/HistoricalAttemptList";
import { Button } from "@/components/ui/button";
import { appMeta } from "@/constants/content";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useDataPlatform } from "@/hooks/useDataPlatform";
import { formatDate, formatTime } from "@/utils/format";
import { WRProgression } from "@/components/dashboard/WRProgression";
import { GroupMilestones } from "@/components/stats/GroupMilestones";
import { PrestigeBadgeEmblem } from "@/components/common/PrestigeBadgeEmblem";
import { badgeTierLabel } from "@/lib/badgePresentation";

export function StatsPage() {
  const { data } = useEffectivePublicData();
  const { snapshot } = useDataPlatform();
  const archivedEvents = data.events.filter(({ status }) => status === "closed");
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="League Intelligence" title="Statistiken" description={appMeta.statsDescription} />
      <DataState>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.statistics.map((statistic, index) => (
            <StatCard key={statistic.id} statistic={statistic} delay={index * 0.06} />
          ))}
        </div>
        <section className="mt-12">
          <WRProgression />
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow="Gemeinsam erreicht" title="Liga-Meilensteine" />
          <GroupMilestones />
        </section>
        <section className="mt-12">
          <SectionHeading eyebrow="Prestige" title="Badge-Seltenheit" />
          <p className="-mt-4 mb-5 max-w-3xl text-sm leading-6 text-white/45">Anteil der aktiven, dauerhaften Spieler, die diese Schwelle mindestens einmal erreicht haben. Höhere Stufen zählen deshalb auch bei den darunterliegenden Schwellen mit; Gäste und AK-Spieler sind ausgeschlossen.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.badgeRarity.map((badge) => <article key={badge.key} className="panel flex items-center gap-4 p-4"><PrestigeBadgeEmblem badge={{ badgeKey: badge.key, tier: badge.tier, name: badge.name }} size="sm" /><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-gold-300">{badgeTierLabel[badge.tier]}</p><h3 className="mt-1 truncate font-display text-lg font-black uppercase">{badge.name}</h3><p className="mt-2 font-display text-2xl font-black">{badge.percent == null ? "—" : `${badge.percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`}</p><p className="mt-1 text-[10px] text-white/35">{badge.recipients} von {badge.playerCount} Spielern</p></div></article>)}
          </div>
        </section>
        <section id="events" className="mt-10 scroll-mt-28">
          <SectionHeading eyebrow="Eventarchiv" title="Vergangene Events" />
          <div className="space-y-3">
            {archivedEvents.length === 0 && (
              <p className="panel py-14 text-center text-sm text-white/35">
                Noch keine abgeschlossenen Events.
              </p>
            )}
            {archivedEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="panel group grid gap-4 p-5 transition hover:border-gold-400/25 sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)_auto] sm:items-center sm:gap-7"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-black uppercase">
                    {event.title}
                  </p>
                  <p className="mt-1 text-xs text-white/35">{formatDate(event.date)}</p>
                </div>
                <EventValue label="Sieger" value={event.winnerNames.join(" & ") || "—"} />
                <EventValue label="Siegerzeit" value={formatTime(event.fastest)} />
                <EventValue label="Teilnehmer" value={String(event.participantIds.length)} />
                <EventValue label="Versuche" value={String(event.attempts)} />
                <ChevronRight className="hidden size-5 text-white/20 transition group-hover:translate-x-1 group-hover:text-gold-300 sm:block" />
              </Link>
            ))}
          </div>
        </section>
        <section id="history" className="mt-12 scroll-mt-28">
          <SectionHeading eyebrow="Zeitarchiv" title="Historische Versuche" />
          <p className="-mt-4 mb-5 max-w-3xl text-sm leading-6 text-white/45">
            Diese offiziellen Einzelzeiten sind keiner vollständig dokumentierten
            Veranstaltung zugeordnet und erzeugen deshalb keine Eventwertung.
          </p>
          <HistoricalAttemptList
            attempts={snapshot.liveState.historicalAttempts}
            limit={6}
          />
          <Button asChild variant="outline" className="mt-5">
            <Link to="/history">Alle historischen Versuche anzeigen</Link>
          </Button>
        </section>
      </DataState>
    </div>
  );
}

function EventValue({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="block text-[9px] uppercase tracking-widest text-white/30">{label}</span>
      <span className="font-semibold text-white/70">{value}</span>
    </p>
  );
}
