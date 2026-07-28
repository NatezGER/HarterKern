import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StatCard } from "@/components/stats/StatCard";
import { appMeta } from "@/constants/content";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { formatDate, formatTime } from "@/utils/format";

export function StatsPage() {
  const { data } = useEffectivePublicData();
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
