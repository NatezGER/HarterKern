import { ArrowLeft, CircleX, Droplets, Medal, Target, Timer, Trophy, Zap } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { SectionHeading } from "@/components/common/SectionHeading";
import { DataState } from "@/components/common/DataState";
import { AttemptNumberChart } from "@/components/players/AttemptNumberChart";
import { Button } from "@/components/ui/button";
import { usePlayerProfileDetail } from "@/hooks/useHistoryProfiles";
import { DRINK_MILLILITERS_PER_VALID_ATTEMPT } from "@/constants/game";
import { formatDrinkVolume } from "@/lib/media";
import { formatDate, formatTime } from "@/utils/format";
import { NotFoundPage } from "@/pages/NotFoundPage";

const displayTime = (value: number | null) => value == null ? "—" : formatTime(value / 100);

export function PlayerProfilePage() {
  const { id = "" } = useParams();
  const { data: player, loading, error } = usePlayerProfileDetail(id);
  if (loading) return <DataState><div /></DataState>;
  if (!player) return error
    ? <div className="panel p-8 text-center text-red-200">{error}</div>
    : <NotFoundPage />;
  const metrics = [
    { label: "Persönliche Bestzeit", value: displayTime(player.personalBestHundredths), icon: Zap },
    { label: "Hall of Fame", value: player.rank ? `#${player.rank}` : "—", icon: Medal },
    { label: "Durchschnitt", value: displayTime(player.averageHundredths), icon: Timer },
    { label: "Eventteilnahmen", value: String(player.eventParticipations), icon: Target },
    { label: "Siege", value: String(player.wins), icon: Trophy },
    { label: "Platz 2 / 3", value: `${player.secondPlaces} / ${player.thirdPlaces}`, icon: Medal },
    { label: "Gültig / DNF", value: `${player.validAttempts} / ${player.dnfCount}`, icon: CircleX },
    { label: "Getrunken", value: formatDrinkVolume(player.validAttempts, DRINK_MILLILITERS_PER_VALID_ATTEMPT), icon: Droplets },
  ];
  return (
    <div className="space-y-10">
      <Button asChild variant="ghost" size="sm"><Link to="/players"><ArrowLeft className="size-4" /> Zurück zu Spielern</Link></Button>
      <section className="panel relative overflow-hidden p-6 sm:p-10">
        <div className="absolute -right-24 -top-36 size-96 rounded-full bg-gold-400/10 blur-[100px]" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <ProfileAvatar id={player.id} name={player.name} url={player.avatarUrl} className="size-28 ring-gold-400/35 sm:size-32" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-400">{player.rank ? `Weltrang #${player.rank}` : "Noch ohne Rang"}</p>
              <h1 className="display-title mt-2 break-words text-5xl sm:text-7xl">{player.name}</h1>
              <p className="mt-2 text-sm text-white/40">{player.isAk ? "Außer Konkurrenz" : "Harter Kern · Aktiver Athlet"}</p>
            </div>
          </div>
          <div className="text-left md:text-right"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Personal Best</p><p className="gold-text font-display text-6xl font-black">{displayTime(player.personalBestHundredths)}</p></div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon }, index) => <AnimatedCard key={label} delay={index * 0.04} className="p-5"><Icon className="size-5 text-gold-400" /><p className="mt-6 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p><p className="mt-1 font-display text-3xl font-black">{value}</p></AnimatedCard>)}</div>

      <section>
        <SectionHeading eyebrow="Event für Event" title="Historie" />
        <div className="space-y-3">
          {player.events.length === 0 && <div className="panel py-14 text-center text-sm text-white/40">Noch keine Eventteilnahme.</div>}
          {player.events.map((event) => <Link key={event.eventId} to={`/events/${event.eventId}`} className="panel grid gap-3 p-5 transition hover:border-gold-400/20 sm:grid-cols-[1fr_repeat(3,8rem)] sm:items-center"><div><p className="font-display text-xl font-black uppercase">{event.eventName}</p><p className="text-xs text-white/35">{formatDate(event.eventDate)}</p></div><HistoryMetric label="Platz" value={event.rank ? `#${event.rank}` : "—"} /><HistoryMetric label="Bestzeit" value={displayTime(event.bestHundredths)} /><HistoryMetric label="Versuche / DNF" value={`${event.attempts} / ${event.dnfCount}`} /></Link>)}
        </div>
      </section>

      <section className="panel p-6 sm:p-8">
        <SectionHeading eyebrow="Leistung im Event" title="Nach Versuchsnummer" />
        <AttemptNumberChart points={player.attemptNumbers} />
      </section>

      {player.badges.length > 0 && <section><SectionHeading eyebrow="Verdient" title="Badges" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{player.badges.map((badge) => <AnimatedCard key={badge.key} className="p-5"><Medal className="size-5 text-gold-400" /><p className="mt-4 font-bold">{badge.name}</p><p className="mt-1 text-xs capitalize text-white/35">{badge.tier} · {formatDate(badge.awardedAt.slice(0, 10))}</p>{badge.eventId && <Link to={`/events/${badge.eventId}`} className="mt-3 inline-block text-xs text-gold-300 hover:underline">Zum Event</Link>}</AnimatedCard>)}</div></section>}
    </div>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return <p><span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">{label}</span><span className="font-display text-lg font-black">{value}</span></p>;
}
