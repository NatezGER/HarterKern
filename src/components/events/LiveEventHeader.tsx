import { CalendarDays, Clock3, Hourglass, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleToggle } from "@/components/events/RoleToggle";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { formatDate } from "@/utils/format";
import type { LiveEvent } from "@/types/liveEvent";

export function LiveEventHeader({
  event,
  attempts,
  pending,
  onEnd,
}: {
  event: LiveEvent;
  attempts: number;
  pending: number;
  onEnd: () => void;
}) {
  const { state } = useLiveEvent();
  const elapsed = useElapsedTime(event.startedAt);
  return (
    <section className="relative overflow-hidden rounded-3xl border border-red-400/15 bg-gradient-to-br from-red-500/[0.12] via-white/[0.035] to-gold-400/[0.06] p-6 sm:p-9">
      <div className="absolute right-0 top-0 size-52 rounded-full bg-red-500/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-300">
            <span className="size-2 animate-pulse rounded-full bg-red-400 motion-reduce:animate-none" />
            Live Event
          </p>
          <h1 className="display-title mt-3 text-4xl sm:text-6xl">{event.name || "Spieleabend"}</h1>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/45">
            <span className="flex items-center gap-2"><CalendarDays className="size-4" /> {formatDate(event.date)}</span>
            <span className="flex items-center gap-2"><Clock3 className="size-4" /> {elapsed}</span>
            <span className="flex items-center gap-2"><Users className="size-4" /> {event.participantIds.length} Teilnehmer</span>
            <span className="flex items-center gap-2"><Hourglass className="size-4" /> {pending} offen</span>
          </div>
          <p className="mt-2 text-xs text-white/30">{attempts} Eventversuche insgesamt</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <RoleToggle />
          {state.role === "admin" && (
            <Button variant="outline" onClick={onEnd}>Event beenden</Button>
          )}
        </div>
      </div>
    </section>
  );
}
