import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/stats/StatCard";
import { DataState } from "@/components/common/DataState";
import { appMeta } from "@/constants/content";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { SectionHeading } from "@/components/common/SectionHeading";
import { formatTime } from "@/utils/format";

export function StatsPage() {
  const { data } = useEffectivePublicData();
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="League Intelligence" title="Statistiken" description={appMeta.statsDescription} />
      <DataState>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.statistics.map((statistic, index) => <StatCard key={statistic.id} statistic={statistic} delay={index * 0.06} />)}
        </div>
        <section className="mt-10">
          <SectionHeading eyebrow="Event-Grundstatistiken" title="Letzte Events" />
          <div className="space-y-3">
            {data.events.length === 0 && <p className="panel py-14 text-center text-sm text-white/35">Noch keine Events.</p>}
            {data.events.slice(0, 8).map((event) => (
              <div key={event.id} className="panel grid gap-4 p-5 sm:grid-cols-[1fr_repeat(4,auto)] sm:items-center sm:gap-8">
                <div>
                  <p className="font-display text-xl font-black uppercase">{event.title}</p>
                  <p className="mt-1 text-xs text-white/35">{event.date} · Sieger: {event.winnerNames.join(" & ") || "noch offen"}</p>
                </div>
                <p className="text-sm"><span className="block text-[9px] uppercase tracking-widest text-white/30">Teilnehmer</span>{event.participantIds.length}</p>
                <p className="text-sm"><span className="block text-[9px] uppercase tracking-widest text-white/30">Gültig / DNF</span>{event.validAttempts} / {event.dnfCount}</p>
                <p className="text-sm"><span className="block text-[9px] uppercase tracking-widest text-white/30">Bestzeit</span>{formatTime(event.fastest)}</p>
                <p className="text-sm"><span className="block text-[9px] uppercase tracking-widest text-white/30">Durchschnitt</span>{formatTime(event.average)}</p>
              </div>
            ))}
          </div>
        </section>
      </DataState>
    </div>
  );
}
