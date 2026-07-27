import { Crown, Flag, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { formatElapsed } from "@/hooks/useElapsedTime";
import { getLiveStandings, isApproved } from "@/lib/liveEventCalculations";
import { formatDate, formatTime } from "@/utils/format";
import type { LiveAttempt, LiveEvent } from "@/types/liveEvent";

export function EventResults({ event, attempts }: { event: LiveEvent; attempts: LiveAttempt[] }) {
  const eventAttempts = attempts.filter(({ eventId }) => eventId === event.id);
  const standings = getLiveStandings(event, eventAttempts);
  const podium = standings.filter(({ approvedBest, player }) => approvedBest != null && !player.isAk).slice(0, 3);
  const winner = podium[0];
  const approved = eventAttempts.filter(isApproved);
  return (
    <div className="space-y-7">
      <section className="panel overflow-hidden p-6 text-center sm:p-10">
        <Crown className="mx-auto size-10 text-gold-400" />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-gold-300">Event beendet</p>
        <h1 className="display-title mt-2 text-4xl sm:text-6xl">{event.name || "Spieleabend"}</h1>
        <p className="mt-3 text-sm text-white/40">{formatDate(event.date)} · {formatElapsed(event.startedAt, event.endedAt)}</p>
        {winner && (
          <div className="mx-auto mt-8 flex max-w-sm items-center justify-center gap-4 rounded-2xl bg-gold-400/[0.08] p-5">
            <LiveAvatar player={winner.player} className="size-16 ring-gold-400/50" />
            <div className="text-left">
              <p className="text-xs uppercase tracking-wider text-white/40">Sieger</p>
              <p className="font-display text-2xl font-black uppercase">{winner.player.name}</p>
              <p className="font-bold text-gold-300">{formatTime(winner.approvedBest ?? 0)}</p>
            </div>
          </div>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <ResultMetric icon={Users} label="Teilnehmer" value={event.participantIds.length} />
        <ResultMetric icon={Target} label="Bestätigt" value={approved.length} />
        <ResultMetric icon={Flag} label="Offen / Abgelehnt" value={eventAttempts.length - approved.length} />
      </div>
      <section className="panel p-5 sm:p-7">
        <h2 className="display-title text-2xl">Top 3</h2>
        <div className="mt-5 space-y-2">
          {podium.map((standing, index) => (
            <div key={standing.player.id} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] p-4">
              <span className="font-display text-2xl font-black text-gold-400">#{index + 1}</span>
              <LiveAvatar player={standing.player} className="size-10" />
              <p className="min-w-0 flex-1 truncate font-bold">{standing.player.name}</p>
              <p className="font-display text-xl font-black">{formatTime(standing.approvedBest ?? 0)}</p>
            </div>
          ))}
        </div>
      </section>
      <Button asChild variant="outline"><Link to="/">Zur Übersicht</Link></Button>
    </div>
  );
}

function ResultMetric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="panel p-5"><Icon className="size-5 text-gold-400" /><p className="mt-4 text-3xl font-black">{value}</p><p className="text-xs text-white/35">{label}</p></div>;
}
