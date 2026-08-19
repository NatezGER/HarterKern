import { AlertTriangle, ArrowLeft, CircleX, Crown, Droplets, LoaderCircle, Medal, RefreshCw, Target, Timer, Trophy, Zap } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { BadgeGallery } from "@/components/common/BadgeGallery";
import { badgeGalleryToggleLabel } from "@/components/common/badgeGalleryState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { DataState } from "@/components/common/DataState";
import { AttemptNumberChart } from "@/components/players/AttemptNumberChart";
import { Button } from "@/components/ui/button";
import { usePlayerProfileDetail } from "@/hooks/useHistoryProfiles";
import type { ProfileSectionState } from "@/hooks/useHistoryProfiles";
import { DRINK_MILLILITERS_PER_VALID_ATTEMPT } from "@/constants/game";
import { formatDrinkVolume } from "@/lib/media";
import { formatDate, formatTime } from "@/utils/format";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProgressionTimeline } from "@/components/progression/ProgressionTimeline";
import { getRecordAt, selectRecordsForPeriod } from "@/lib/recordComparison";
import { PodiumMedal } from "@/components/common/PodiumMedal";
import { getPodiumCounters } from "@/lib/podiumCounters";
import { useState } from "react";
import { PersonalBestDetailsToggle } from "@/components/progression/PersonalBestDetailsToggle";
import { TrophyCabinet } from "@/components/common/TrophyCabinet";
import { PersonalBingo } from "@/components/players/PersonalBingo";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { useSeason } from "@/hooks/useSeason";
import { getEventSeason } from "@/lib/season";
import { dnfPercentage } from "@/lib/officialTimePerformance";

const displayTime = (value: number | null) => value == null ? "—" : formatTime(value / 100);

export function PlayerProfilePage() {
  const { id = "" } = useParams();
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const [pbDetailsExpanded, setPbDetailsExpanded] = useState(false);
  const { season: selectedSeason, isAllTime } = useSeason();
  const { core, season, trophies, badges, prestige, progression, performance, bingo, attemptNumbers, events } =
    usePlayerProfileDetail(id);
  if (core.loading) return <DataState><div /></DataState>;
  if (!core.data) return core.error
    ? <div className="panel p-8 text-center text-red-200">{core.error}</div>
    : <NotFoundPage />;
  const player = core.data;
  const seasonStats = season.data ?? {
    personalBestHundredths: null, rank: null, averageHundredths: null,
    eventParticipations: 0, wins: 0, secondPlaces: 0, thirdPlaces: 0,
    validAttempts: 0, dnfCount: 0,
  };
  const activeStats = isAllTime ? player : seasonStats;
  const hasSeasonTime = isAllTime || seasonStats.personalBestHundredths != null;
  const activeDnfPercent = dnfPercentage(activeStats.validAttempts, activeStats.dnfCount);
  const coreMetrics = [
    { label: isAllTime ? "Durchschnitt" : "Saison-Durchschnitt", value: displayTime(activeStats.averageHundredths), icon: Timer },
    { label: isAllTime ? "Eventteilnahmen" : "Saison-Events", value: String(activeStats.eventParticipations), icon: Target },
    { label: "Gültige Versuche", value: String(activeStats.validAttempts), icon: Timer },
    { label: "DNF", value: `${activeStats.dnfCount} · ${activeDnfPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`, icon: CircleX },
    { label: isAllTime ? "Getrunken" : "Saison getrunken", value: !isAllTime && !hasSeasonTime ? "—" : formatDrinkVolume(activeStats.validAttempts, DRINK_MILLILITERS_PER_VALID_ATTEMPT), icon: Droplets },
  ];
  return (
    <div className="space-y-7 sm:space-y-10">
      <Button asChild variant="ghost" size="sm"><Link to="/players"><ArrowLeft className="size-4" /> Zurück zu Spielern</Link></Button>
      <section className="panel relative overflow-hidden p-5 sm:p-10">
        <div className="absolute -right-24 -top-36 size-96 rounded-full bg-gold-400/10 blur-[100px]" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="flex w-full flex-col items-center gap-5 text-center sm:w-auto sm:flex-row sm:items-center sm:text-left">
            <ProfileAvatar id={player.id} name={player.name} url={player.avatarUrl} className="size-24 ring-gold-400/35 max-sm:p-0.5 max-sm:[&>img]:h-auto max-sm:[&>img]:w-full sm:size-32" />
            <div>
              <p className="context-accent-text text-xs font-bold uppercase tracking-[0.22em]">{activeStats.rank ? `${isAllTime ? "Weltrang" : "Saisonrang"} #${activeStats.rank}` : isAllTime ? "Noch ohne Rang" : `Noch ohne Saisonrang ${selectedSeason}`}</p>
              <h1 className="display-title mt-2 break-words text-5xl sm:text-7xl">{player.name}</h1>
              <div className="mt-3"><SeasonContextBadge /></div>
              {player.isAk && <p className="mt-2 text-sm text-white/40">Außer Konkurrenz</p>}
            </div>
          </div>
          <div className="w-full text-center sm:w-auto sm:text-left md:text-right"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{isAllTime ? "Personal Best" : `Saison-PB ${selectedSeason}`}</p><p className="context-gradient-text font-display text-5xl font-black sm:text-6xl">{displayTime(activeStats.personalBestHundredths)}</p></div>
        </div>
      </section>

      <ProfileOptionalState state={trophies}>{(data) => data.length > 0 ? (
        <section><SectionHeading eyebrow="Karriere-Auszeichnungen" title="Trophäenschrank" /><TrophyCabinet trophies={data} /></section>
      ) : null}</ProfileOptionalState>

      <ProfileOptionalState state={badges}>{(data) => data.length > 0 ? (
        <section><SectionHeading eyebrow={isAllTime ? "Verdient" : "Karriere · All-Time"} title="Badge-Galerie" /><BadgeGallery badges={data} featured mobileLimit={2} desktopLimit={3} expanded={badgesExpanded} />{data.length > 2 && <Button type="button" variant="outline" className="mt-4 w-full sm:w-auto" aria-expanded={badgesExpanded} onClick={() => setBadgesExpanded((value) => !value)}>{badgeGalleryToggleLabel(badgesExpanded)}</Button>}</section>
      ) : null}</ProfileOptionalState>

      <section className="panel p-5 sm:p-8">
        <SectionHeading eyebrow={isAllTime ? "Offizielle Events" : `Saison ${selectedSeason} · Offizielle Events`} title="Podiumsmedaillen" />
        <div className="grid grid-cols-3 gap-2 sm:gap-4">{getPodiumCounters(activeStats).map((counter) => <article key={counter.rank} className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-center sm:flex-row sm:gap-5 sm:p-5 sm:text-left"><PodiumMedal rank={counter.rank} size="lg" /><div><p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/35 sm:text-[10px] sm:tracking-[0.18em]">{counter.label} · Platz {counter.rank}</p><p className="mt-1 font-display text-3xl font-black sm:text-4xl">{counter.count}</p></div></article>)}</div>
      </section>

      <ProfileOptionalState state={progression}>{(data) => {
        const personalProgression = data.personal.map((point) => {
          const record = getRecordAt(data.worldRecords, point.achievedAt);
          return { ...point, playerId: player.id, playerName: player.name, avatarUrl: player.avatarUrl, hasExactTime: point.sourceType === "attempt", distanceToComparisonHundredths: record ? Math.max(0, point.timeHundredths - record.timeHundredths) : null };
        });
        const firstPbAt = personalProgression[0]?.achievedAt;
        const comparisonProgression = firstPbAt ? selectRecordsForPeriod(data.worldRecords, firstPbAt, new Date().toISOString()).map((record) => ({ id: record.id, playerId: record.playerId, playerName: record.playerName, avatarUrl: record.avatarUrl, timeHundredths: record.timeHundredths, achievedAt: record.achievedAt, achievedDate: record.achievedDate, axisAt: record.axisAt, eventId: record.eventId, sourceLabel: record.sourceLabel, improvementHundredths: record.improvementHundredths, durationDays: record.durationDays, isCurrent: record.isCurrent, hasExactTime: record.sourceType === "attempt" })) : [];
        return (
          <section className="panel p-5 sm:p-8">
            <SectionHeading eyebrow={isAllTime ? "Persönliche Bestmarken" : `Saison ${selectedSeason}`} title={isAllTime ? "PB Progression" : "Saison-PB-Progression"} />
            <ProgressionTimeline points={personalProgression} comparisonPoints={comparisonProgression} comparisonLabel={isAllTime ? "Weltrekord" : "Saisonrekord"} historyDisclosure={{ id: "personal-best-history", expanded: pbDetailsExpanded }} emptyLabel={isAllTime ? "Noch keine persönliche Bestzeit vorhanden." : `Noch keine Saison-PB ${selectedSeason} vorhanden.`} />
            {personalProgression.length > 0 && <PersonalBestDetailsToggle expanded={pbDetailsExpanded} controls="personal-best-history" onToggle={() => setPbDetailsExpanded((value) => !value)} />}
          </section>
        );
      }}</ProfileOptionalState>

      <section className="panel overflow-hidden p-4 sm:p-8">
        <SectionHeading eyebrow={isAllTime ? "Persönliche Langzeitjagd" : "Karriere · All-Time"} title="BINGO" />
        <p className="mb-5 max-w-2xl text-sm leading-6 text-white/45">Jede eigene Hundertstel-Endung steigt vom ersten Treffer in Bronze über Silber bis Gold. Im persönlichen BINGO werden bewusst keine Profilbilder gezeigt.</p>
        <ProfileOptionalState state={bingo}>{(data) => <PersonalBingo data={data} />}</ProfileOptionalState>
      </section>

      <ProfileOptionalState state={attemptNumbers}>{(data) => (
        <section className="panel p-6 sm:p-8">
          <SectionHeading eyebrow={isAllTime ? "Leistung im Event" : "Karriere · All-Time"} title="Nach Versuchsnummer" />
          <AttemptNumberChart points={data} />
        </section>
      )}</ProfileOptionalState>

      <section>
        <SectionHeading eyebrow={isAllTime ? "Karrierewerte" : `Saisonwerte ${selectedSeason}`} title="Statistik" />
        {!hasSeasonTime && <div className="panel mb-4 border-emerald-300/15 px-5 py-4 text-sm text-white/45">Noch keine qualifizierte Saisonzeit {selectedSeason}. Zeitbasierte Saisonwerte bleiben leer.</div>}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{coreMetrics.map(({ label, value, icon: Icon }, index) => <AnimatedCard key={label} delay={index * 0.04} className="min-w-0 p-4 sm:p-5"><Icon className="context-accent-text size-5" /><p className="mt-4 break-words text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 sm:mt-6 sm:tracking-[0.18em]">{label}</p><p className="mt-1 break-words font-display text-2xl font-black sm:text-3xl">{value}</p></AnimatedCard>)}</div>
        <div className="mt-3 sm:mt-4"><ProfileOptionalState state={performance}>{(data) => <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{data.thresholds.map((threshold, index) => <AnimatedCard key={threshold.seconds} delay={index * 0.04} className="min-w-0 p-4 sm:p-5"><Target className="context-accent-text size-5" /><p className="mt-4 text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 sm:mt-6">Unter {threshold.seconds} s</p><p className="mt-1 font-display text-2xl font-black sm:text-3xl">{threshold.percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</p></AnimatedCard>)}</div>}</ProfileOptionalState></div>
        <div className="mt-3 sm:mt-4">{!isAllTime && <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Karriere · All-Time</p>}<ProfileOptionalState state={prestige}>{(data) => {
          const prestigeMetrics = [
            { label: "PB-Verbesserungen", value: String(data.pbCount), icon: Zap },
            { label: "Größter PB-Sprung", value: displayTime(data.largestPbImprovementHundredths), icon: Zap },
            { label: "Weltrekorde", value: String(data.worldRecordCount), icon: Trophy },
            { label: "Tage mit WR", value: String(data.worldRecordDays), icon: Timer },
            { label: "Längste WR-Phase", value: `${data.longestWorldRecordDays} Tage`, icon: Crown },
            { label: "Sichtbare Badges", value: String(data.visibleBadgeCount), icon: Medal },
          ];
          return <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{prestigeMetrics.map(({ label, value, icon: Icon }, index) => <AnimatedCard key={label} delay={index * 0.04} className="min-w-0 p-4 sm:p-5"><Icon className="size-5 text-gold-400" /><p className="mt-4 break-words text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 sm:mt-6 sm:tracking-[0.18em]">{label}</p><p className="mt-1 break-words font-display text-2xl font-black sm:text-3xl">{value}</p></AnimatedCard>)}</div>;
        }}</ProfileOptionalState></div>
      </section>

      <ProfileOptionalState state={events}>{(data) => (
        <section>
          <SectionHeading eyebrow={isAllTime ? "Event für Event" : `Event für Event · Saison ${selectedSeason}`} title="Historie" />
          <div className="space-y-3">
            {data.filter((event) => isAllTime || getEventSeason(event.eventDate) === selectedSeason).length === 0 && <div className="panel py-14 text-center text-sm text-white/40">Noch keine Eventteilnahme in dieser Saison.</div>}
            {data.filter((event) => isAllTime || getEventSeason(event.eventDate) === selectedSeason).map((event) => <Link key={event.eventId} to={`/events/${event.eventId}`} className="panel grid gap-3 p-5 transition hover:border-gold-400/20 sm:grid-cols-[1fr_repeat(3,8rem)] sm:items-center"><div><p className="font-display text-xl font-black uppercase">{event.eventName}</p><p className="text-xs text-white/35">{formatDate(event.eventDate)}</p></div><HistoryMetric label="Platz" value={event.rank ? `#${event.rank}` : "—"} /><HistoryMetric label="Bestzeit" value={displayTime(event.bestHundredths)} /><HistoryMetric label="Versuche / DNF" value={`${event.attempts} / ${event.dnfCount}`} /></Link>)}
          </div>
        </section>
      )}</ProfileOptionalState>
    </div>
  );
}

function ProfileOptionalState<T>({
  state,
  children,
}: {
  state: ProfileSectionState<T>;
  children: (data: T) => ReactNode;
}) {
  if (state.data != null) return <>{children(state.data)}</>;
  if (state.error) {
    return (
      <div className="panel grid min-h-40 place-items-center p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-amber-300" />
          <p className="mt-3 text-sm font-semibold text-white/70">Dieser Bereich konnte nicht geladen werden.</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={state.retry}>
            <RefreshCw className="size-4" /> Bereich erneut laden
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="panel grid min-h-40 place-items-center p-6 text-center text-sm text-white/40">
      <span><LoaderCircle className="mx-auto mb-3 size-5 animate-spin text-gold-400" />Bereich wird geladen.</span>
    </div>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return <p><span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">{label}</span><span className="font-display text-lg font-black">{value}</span></p>;
}
