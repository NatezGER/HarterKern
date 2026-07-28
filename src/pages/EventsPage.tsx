import { CalendarDays, ChevronRight, Radio, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { getLiveStandings } from "@/lib/liveEventCalculations";
import { formatDate, formatTime } from "@/utils/format";

export function EventsPage() {
  const { state } = useLiveEvent();
  const events = [...state.events].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Eventarchiv"
        title="Events"
        description="Aktuelle und vergangene Spieleabende mit dauerhaft gespeicherten Ergebnissen."
      />
      <DataState>
        <div className="grid gap-4 lg:grid-cols-2">
          {events.length === 0 && (
            <div className="panel col-span-full py-16 text-center">
              <CalendarDays className="mx-auto size-8 text-gold-400" />
              <p className="mt-4 text-sm text-white/40">Noch keine Events vorhanden.</p>
            </div>
          )}
          {events.map((event) => {
            const attempts = state.attempts.filter(({ eventId }) => eventId === event.id);
            const winner = getLiveStandings(event, attempts, state.players)
              .find(({ bestTime }) => bestTime != null);
            return (
              <Link
                key={event.id}
                to={event.status === "active" ? "/events/live" : `/events/${event.id}`}
                className="panel group p-5 transition hover:-translate-y-0.5 hover:border-gold-400/25 sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      event.status === "active"
                        ? "bg-red-400/10 text-red-300"
                        : "bg-white/[0.06] text-white/40"
                    }`}>
                      {event.status === "active" && <Radio className="size-3" />}
                      {event.status === "active" ? "Live" : "Abgeschlossen"}
                    </span>
                    <h2 className="display-title mt-4 text-3xl">{event.name || "Spieleabend"}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-white/40">
                      <CalendarDays className="size-4" /> {formatDate(event.date)}
                    </p>
                  </div>
                  <ChevronRight className="size-6 text-white/20 transition group-hover:translate-x-1 group-hover:text-gold-300" />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Small icon={Users} label="Teilnehmer" value={event.participantIds.length} />
                  <Small icon={Target} label="Versuche" value={attempts.length} />
                  <Small icon={CalendarDays} label="Bestzeit" value={formatTime(winner?.bestTime ?? 0)} />
                </div>
                {winner && (
                  <div className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                    <LiveAvatar player={winner.player} className="size-10" />
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-white/30">Sieger</p>
                      <p className="font-bold">{winner.player.name}</p>
                    </div>
                    {winner.player.kind === "guest" && (
                      <span className="ml-auto text-[10px] font-bold uppercase text-gold-300">Gast</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </DataState>
    </div>
  );
}

function Small({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3">
      <Icon className="size-4 text-gold-400" />
      <p className="mt-2 font-bold">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-white/30">{label}</p>
    </div>
  );
}
