import { ArrowLeft, CircleX, Crown, Droplets, Medal, Target, Timer, Trophy, Zap } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { BadgeGallery } from "@/components/common/BadgeGallery";
import { SectionHeading } from "@/components/common/SectionHeading";
import { DataState } from "@/components/common/DataState";
import { AttemptNumberChart } from "@/components/players/AttemptNumberChart";
import { Button } from "@/components/ui/button";
import { usePlayerProfileDetail } from "@/hooks/useHistoryProfiles";
import { DRINK_MILLILITERS_PER_VALID_ATTEMPT } from "@/constants/game";
import { formatDrinkVolume } from "@/lib/media";
import { formatDate, formatTime } from "@/utils/format";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProgressionTimeline } from "@/components/progression/ProgressionTimeline";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { getPlayerById } from "@/data/selectors";
import { getRecordAt, selectRecordsForPeriod } from "@/lib/recordComparison";
import { PodiumMedal } from "@/components/common/PodiumMedal";
import { getPodiumCounters } from "@/lib/podiumCounters";
import { useState } from "react";

const displayTime = (value: number | null) => value == null ? "—" : formatTime(value / 100);

export function PlayerProfilePage() {
  const { id = "" } = useParams();
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const { data: player, loading, error } = usePlayerProfileDetail(id);
  const { data: publicData } = useEffectivePublicData();
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
    { label: "PB-Verbesserungen", value: String(player.pbCount), icon: Zap },
    { label: "Größter PB-Sprung", value: displayTime(player.largestPbImprovementHundredths), icon: Zap },
    { label: "Ø PB-Sprung", value: displayTime(player.averagePbImprovementHundredths), icon: Timer },
    { label: "Weltrekorde", value: String(player.worldRecordCount), icon: Trophy },
    { label: "Tage mit WR", value: String(player.worldRecordDays), icon: Timer },
    { label: "Längste WR-Phase", value: `${player.longestWorldRecordDays} Tage`, icon: Crown },
    { label: "Sichtbare Badges", value: String(player.visibleBadgeCount), icon: Medal },
  ];
  const personalProgression = player.progression.map((point) => {
    const record = getRecordAt(publicData.worldRecordHistory.map((item) => ({ id: item.id, achievedAt: item.achievedAt, timeHundredths: Math.round(item.time * 100) })), point.achievedAt);
    return { ...point, playerId: player.id, playerName: player.name, avatarUrl: player.avatarUrl, hasExactTime: point.sourceType === "attempt", distanceToComparisonHundredths: record ? Math.max(0, point.timeHundredths - record.timeHundredths) : null };
  });
  const firstPbAt = personalProgression[0]?.achievedAt;
  const comparisonProgression = firstPbAt ? selectRecordsForPeriod(publicData.worldRecordHistory.map((record) => ({ ...record, timeHundredths: Math.round(record.time * 100), achievedAt: record.achievedAt })), firstPbAt, new Date().toISOString()).map((record) => {
    const holder = getPlayerById(publicData.players, record.playerId);
    return { id: record.id, playerId: record.playerId, playerName: holder?.name ?? "Unbekannt", avatarUrl: holder?.avatarUrl ?? null, timeHundredths: record.timeHundredths, achievedAt: record.achievedAt, achievedDate: record.date, axisAt: record.axisAt, eventId: record.eventId, sourceLabel: record.location, improvementHundredths: record.improvementHundredths, durationDays: record.durationDays, isCurrent: record.isCurrent, hasExactTime: record.sourceType === "attempt" };
  }) : [];
  return (
    <div className="space-y-7 sm:space-y-10">
      <Button asChild variant="ghost" size="sm"><Link to="/players"><ArrowLeft className="size-4" /> Zurück zu Spielern</Link></Button>
      <section className="panel relative overflow-hidden p-5 sm:p-10">
        <div className="absolute -right-24 -top-36 size-96 rounded-full bg-gold-400/10 blur-[100px]" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="flex w-full flex-col items-center gap-5 text-center sm:w-auto sm:flex-row sm:items-center sm:text-left">
            <ProfileAvatar id={player.id} name={player.name} url={player.avatarUrl} variant="profile" className="size-24 ring-gold-400/35 sm:size-32" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-400">{player.rank ? `Weltrang #${player.rank}` : "Noch ohne Rang"}</p>
              <h1 className="display-title mt-2 break-words text-5xl sm:text-7xl">{player.name}</h1>
              <p className="mt-2 text-sm text-white/40">{player.isAk ? "Außer Konkurrenz" : "Harter Kern · Aktiver Athlet"}</p>
            </div>
          </div>
          <div className="w-full text-center sm:w-auto sm:text-left md:text-right"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Personal Best</p><p className="gold-text font-display text-5xl font-black sm:text-6xl">{displayTime(player.personalBestHundredths)}</p></div>
        </div>
      </section>

      {player.badges.length > 0 && <section><SectionHeading eyebrow="Verdient" title="Badge-Galerie" /><BadgeGallery badges={player.badges} featured mobileLimit={2} mobileExpanded={badgesExpanded} />{player.badges.length > 2 && <Button type="button" variant="outline" className="mt-4 w-full sm:hidden" aria-expanded={badgesExpanded} onClick={() => setBadgesExpanded((value) => !value)}>{badgesExpanded ? "Badges einklappen" : "Alle Badges anzeigen"}</Button>}</section>}

      <section className="panel p-5 sm:p-8">
        <SectionHeading eyebrow="Offizielle Events" title="Podiumsmedaillen" />
        <div className="grid grid-cols-3 gap-2 sm:gap-4">{getPodiumCounters(player).map((counter) => <article key={counter.rank} className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-center sm:flex-row sm:gap-5 sm:p-5 sm:text-left"><PodiumMedal rank={counter.rank} size="lg" /><div><p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/35 sm:text-[10px] sm:tracking-[0.18em]">{counter.label} · Platz {counter.rank}</p><p className="mt-1 font-display text-3xl font-black sm:text-4xl">{counter.count}</p></div></article>)}</div>
      </section>

      <section className="panel p-5 sm:p-8">
        <SectionHeading eyebrow="Persönliche Bestmarken" title="PB Progression" />
        <ProgressionTimeline points={personalProgression} comparisonPoints={comparisonProgression} emptyLabel="Noch keine persönliche Bestzeit vorhanden." />
      </section>

      <section className="panel p-6 sm:p-8">
        <SectionHeading eyebrow="Leistung im Event" title="Nach Versuchsnummer" />
        <AttemptNumberChart points={player.attemptNumbers} />
      </section>

      <section>
        <SectionHeading eyebrow="Karrierewerte" title="Statistik" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon }, index) => <AnimatedCard key={label} delay={index * 0.04} className="p-5"><Icon className="size-5 text-gold-400" /><p className="mt-6 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p><p className="mt-1 font-display text-3xl font-black">{value}</p></AnimatedCard>)}</div>
      </section>

      <section>
        <SectionHeading eyebrow="Event für Event" title="Historie" />
        <div className="space-y-3">
          {player.events.length === 0 && <div className="panel py-14 text-center text-sm text-white/40">Noch keine Eventteilnahme.</div>}
          {player.events.map((event) => <Link key={event.eventId} to={`/events/${event.eventId}`} className="panel grid gap-3 p-5 transition hover:border-gold-400/20 sm:grid-cols-[1fr_repeat(3,8rem)] sm:items-center"><div><p className="font-display text-xl font-black uppercase">{event.eventName}</p><p className="text-xs text-white/35">{formatDate(event.eventDate)}</p></div><HistoryMetric label="Platz" value={event.rank ? `#${event.rank}` : "—"} /><HistoryMetric label="Bestzeit" value={displayTime(event.bestHundredths)} /><HistoryMetric label="Versuche / DNF" value={`${event.attempts} / ${event.dnfCount}`} /></Link>)}
        </div>
      </section>
    </div>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return <p><span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">{label}</span><span className="font-display text-lg font-black">{value}</span></p>;
}
