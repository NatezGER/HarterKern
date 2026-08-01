import { ArrowRight, CalendarDays, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/utils/format";
import { PodiumMedal } from "@/components/common/PodiumMedal";
import { resolveEventPodiumAvatar } from "@/data/selectors";

export function LatestEventCard() {
  const { data } = useEffectivePublicData();
  const event = data.events.find(({ status }) => status === "closed");
  if (!event) return null;
  return (
    <section>
      <SectionHeading eyebrow="Zuletzt entschieden" title="Letztes Event" />
      <div className="panel overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-black uppercase sm:text-3xl">{event.title}</h3>
            <p className="mt-1 flex items-center gap-2 text-xs text-white/40"><CalendarDays className="size-3.5 text-gold-300" /> {formatDate(event.date)}</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to={`/events/${event.id}`}>Zum Event <ArrowRight className="size-4" /></Link></Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(event.podium ?? []).map((entry) => {
            return <Link key={`${entry.id}-${entry.rank}`} to={`/events/${event.id}`} className={cn("flex items-center gap-3 rounded-2xl border p-3 transition hover:border-gold-400/30", entry.rank === 1 ? "border-gold-400/25 bg-gold-400/[0.07]" : "border-white/[0.07] bg-white/[0.025]") }>
              <PodiumMedal rank={entry.rank as 1 | 2 | 3} size="sm" />
              <ProfileAvatar id={entry.id} name={entry.name} url={resolveEventPodiumAvatar(data.players, entry)} variant="podium" className="size-11" />
              <div className="min-w-0"><p className="truncate font-bold">{entry.name}</p><p className="font-display text-lg font-black text-gold-300">{formatTime(entry.time)}</p></div>
            </Link>;
          })}
          {(event.podium ?? []).length === 0 && <p className="col-span-full py-5 text-center text-sm text-white/35">Noch kein Podium verfügbar.</p>}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-white/35"><Trophy className="size-4 text-gold-300" /> Beste Eventzeit: <strong className="text-white/70">{formatTime(event.fastest)}</strong></p>
      </div>
    </section>
  );
}
