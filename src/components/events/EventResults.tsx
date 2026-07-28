import {
  BarChart3,
  CalendarDays,
  Clock3,
  Crown,
  Gauge,
  Medal,
  Target,
  Timer,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AttemptHistory } from "@/components/events/AttemptHistory";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { LiveLeaderboard } from "@/components/events/LiveLeaderboard";
import { getEventAnalytics } from "@/lib/eventAnalytics";
import { formatElapsed } from "@/hooks/useElapsedTime";
import { formatDate, formatTime } from "@/utils/format";
import type { LiveAttempt, LiveEvent, LiveParticipant } from "@/types/liveEvent";

const participantContent = (participant: LiveParticipant) => (
  <>
    <LiveAvatar player={participant} className="size-11" />
    <div className="min-w-0">
      <p className="truncate font-bold">{participant.name}</p>
      <p className="text-[10px] text-white/35">
        {participant.kind === "guest" ? "Gastspieler" : "Permanenter Spieler"}
      </p>
    </div>
  </>
);

export function EventResults({
  event,
  attempts,
  players,
}: {
  event: LiveEvent;
  attempts: LiveAttempt[];
  players: LiveParticipant[];
}) {
  const analytics = getEventAnalytics(event, attempts, players);
  const podium = analytics.standings.filter(({ bestTime }) => bestTime != null).slice(0, 3);
  const winner = podium[0];
  const records = analytics.attempts.filter((attempt) => {
    const milestone = analytics.milestones.get(attempt.id);
    return milestone?.isPersonalBest || milestone?.isWorldRecord;
  });

  return (
    <div className="space-y-7 lg:space-y-10">
      <section className="panel overflow-hidden p-6 sm:p-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-300">
              {event.status === "active" ? "Live-Event" : "Event abgeschlossen"}
            </p>
            <h1 className="display-title mt-2 text-4xl sm:text-6xl">
              {event.name || "Spieleabend"}
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/45">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4" /> {formatDate(event.date)}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="size-4" />
                {new Date(event.startedAt).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} Uhr
              </span>
              <span>{formatElapsed(event.startedAt, event.endedAt)}</span>
            </div>
          </div>
          {winner && (
            <div className="flex items-center gap-4 rounded-2xl border border-gold-400/20 bg-gold-400/[0.07] p-5">
              <Crown className="size-7 text-gold-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Sieger</p>
                <p className="font-display text-2xl font-black uppercase">{winner.player.name}</p>
                <p className="font-bold text-gold-300">{formatTime(winner.bestTime ?? 0)}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="display-title mb-4 text-3xl">Eventstatistiken</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Users} label="Teilnehmer" value={analytics.participants.length} />
          <Metric icon={UserRound} label="Gäste" value={analytics.guestCount} />
          <Metric icon={Target} label="Versuche" value={analytics.attempts.length} />
          <Metric icon={Timer} label="Gültige Zeiten" value={analytics.validAttempts} />
          <Metric icon={Trophy} label="Schnellste Zeit" value={formatTime(analytics.fastestTime ?? 0)} />
          <Metric icon={Gauge} label="Langsamste Zeit" value={formatTime(analytics.slowestTime ?? 0)} />
          <Metric icon={BarChart3} label="Durchschnitt" value={formatTime(analytics.averageTime ?? 0)} />
          <Metric icon={BarChart3} label="Median" value={formatTime(analytics.medianTime ?? 0)} />
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="display-title text-3xl">Podium</h2>
        {podium.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/35">Noch keine gültige Zeit.</p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {podium.map((standing, index) => {
              const card = (
                <>
                  <span className="font-display text-3xl font-black text-gold-400">
                    #{standing.rank ?? index + 1}
                  </span>
                  <LiveAvatar player={standing.player} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{standing.player.name}</p>
                    <p className="text-xs text-white/35">
                      {standing.player.kind === "guest" ? "Gast" : `${standing.attempts} Versuche`}
                    </p>
                  </div>
                  <p className="font-display text-xl font-black">{formatTime(standing.bestTime ?? 0)}</p>
                </>
              );
              return standing.player.kind === "permanent" ? (
                <Link
                  to={`/player/${standing.player.id}`}
                  key={standing.player.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  {card}
                </Link>
              ) : (
                <div key={standing.player.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4">
                  {card}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <LiveLeaderboard standings={analytics.standings} />

      <section className="panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-5 py-5 sm:px-7">
          <h2 className="display-title text-3xl">Teilnehmerstatistiken</h2>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {analytics.participantStats.map((standing) => (
            <article
              key={standing.player.id}
              className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_repeat(4,7rem)] sm:items-center sm:px-7"
            >
              {standing.player.kind === "permanent" ? (
                <Link to={`/player/${standing.player.id}`} className="flex min-w-0 items-center gap-3">
                  {participantContent(standing.player)}
                </Link>
              ) : <div className="flex min-w-0 items-center gap-3">{participantContent(standing.player)}</div>}
              <SmallMetric label="Bestzeit" value={formatTime(standing.bestTime ?? 0)} />
              <SmallMetric label="Durchschnitt" value={formatTime(standing.averageTime ?? 0)} />
              <SmallMetric label="Versuche" value={String(standing.attempts)} />
              <SmallMetric
                label="Rekorde"
                value={standing.player.kind === "guest"
                  ? "Eventintern"
                  : `${standing.personalBests} PB · ${standing.worldRecords} WR`}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Medal className="size-6 text-gold-400" />
          <h2 className="display-title text-3xl">Rekorde in diesem Event</h2>
        </div>
        <div className="mt-5 space-y-2">
          {records.length === 0 && (
            <p className="py-8 text-center text-sm text-white/35">Keine neuen PB oder WR.</p>
          )}
          {records.map((attempt) => {
            const participant = players.find(({ id }) => id === attempt.playerId);
            const milestone = analytics.milestones.get(attempt.id);
            if (!participant) return null;
            return (
              <div key={attempt.id} className="flex items-center gap-4 rounded-xl bg-white/[0.03] p-4">
                <LiveAvatar player={participant} className="size-10" />
                <p className="min-w-0 flex-1 truncate font-bold">{participant.name}</p>
                {milestone?.isPersonalBest && <span className="text-xs font-bold text-emerald-300">PB</span>}
                {milestone?.isWorldRecord && <span className="text-xs font-bold text-gold-300">WR</span>}
                <p className="font-display text-xl font-black">{formatTime(attempt.timeSeconds ?? 0)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <AttemptHistory event={event} attempts={analytics.attempts} />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="panel p-5">
      <Icon className="size-5 text-gold-400" />
      <p className="mt-4 text-2xl font-black">{value}</p>
      <p className="text-xs text-white/35">{label}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="block text-[9px] uppercase tracking-widest text-white/30">{label}</span>
      {value}
    </p>
  );
}
