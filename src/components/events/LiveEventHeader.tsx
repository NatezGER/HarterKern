import { CalendarDays, Clock3, Users } from "lucide-react";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { formatDate } from "@/utils/format";
import type { LiveEvent } from "@/types/liveEvent";

export function LiveEventHeader({
  event,
  attempts,
}: {
  event: LiveEvent;
  attempts: number;
}) {
  const elapsed = useElapsedTime(event.startedAt);
  return (
    <section className="relative overflow-hidden rounded-3xl border border-red-400/15 bg-gradient-to-br from-red-500/[0.12] via-white/[0.035] to-gold-400/[0.06] p-4 sm:p-9">
      <div className="absolute right-0 top-0 size-52 rounded-full bg-red-500/10 blur-3xl" />
      <div className="relative">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-300">
            <span className="size-2 animate-pulse rounded-full bg-red-400 motion-reduce:animate-none" />
            Live Event
          </p>
          <h1 className="display-title mt-2 text-3xl sm:mt-3 sm:text-6xl">{event.name || "Spieleabend"}</h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/45 sm:mt-5 sm:gap-x-5 sm:gap-y-2 sm:text-sm">
            <span className="flex items-center gap-2"><CalendarDays className="size-4" /> {formatDate(event.date)}</span>
            <span className="flex items-center gap-2"><Clock3 className="size-4" /> {elapsed}</span>
            <span className="flex items-center gap-2"><Users className="size-4" /> {event.participantIds.length} Teilnehmer</span>
          </div>
          <p className="mt-1.5 text-xs text-white/30 sm:mt-2">{attempts} Eventversuche insgesamt</p>
        </div>
      </div>
    </section>
  );
}
