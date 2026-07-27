import { CalendarDays, MapPin, Target, Timer, Users } from "lucide-react";
import { formatDate } from "@/utils/format";
import { usePublicData } from "@/hooks/usePublicData";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { Button } from "@/components/ui/button";

export function CurrentEventCard() {
  const { data } = usePublicData();
  const event = data.events.find((item) => item.status === "active");
  if (!event) {
    return <AnimatedCard className="grid min-h-72 place-items-center p-8 text-center" hover={false}><div><CalendarDays className="mx-auto size-7 text-gold-400" /><h3 className="display-title mt-4 text-3xl">Kein aktives Event</h3><p className="mt-2 text-sm text-white/40">Die nächste Einreichung startet automatisch ein neues Event.</p></div></AnimatedCard>;
  }
  const details = [
    { icon: CalendarDays, label: "Datum", value: formatDate(event.date) },
    { icon: Users, label: "Teilnehmer", value: `${event.participantIds.length} bestätigt` },
    { icon: Target, label: "Versuche", value: `${event.attempts} bestätigt` },
    { icon: Timer, label: "Gültige Zeiten", value: String(event.validAttempts) },
    { icon: Target, label: "DNF", value: String(event.dnfCount) },
    { icon: Timer, label: "Aktuelle Bestzeit", value: event.fastest > 0 ? `${event.fastest.toLocaleString("de-DE", { minimumFractionDigits: 2 })} s` : "—" },
  ];

  return (
    <AnimatedCard className="relative overflow-hidden bg-gradient-to-br from-white/[0.06] to-transparent p-6 sm:p-8" hover={false}>
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gold-400/[0.04] [clip-path:polygon(55%_0,100%_0,100%_100%,0_100%)]" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Aktuelles Event
            </span>
            <h3 className="display-title mt-5 text-4xl sm:text-5xl">{event.title}</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/40"><MapPin className="size-4 text-gold-400" /> Event vom {formatDate(event.date)}</p>
          </div>
          <Button variant="outline">Event ansehen</Button>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
              <Icon className="mb-4 size-5 text-gold-400" />
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p>
              <p className="mt-1 font-display text-xl font-bold uppercase">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </AnimatedCard>
  );
}
