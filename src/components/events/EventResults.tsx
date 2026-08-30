import { CalendarDays, CircleX, Star, Target, Timer, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { EventAttemptList } from "@/components/events/EventAttemptList";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { BadgeGallery } from "@/components/common/BadgeGallery";
import { EventAttemptNumberChart } from "@/components/events/EventAttemptNumberChart";
import { formatDate, formatTime } from "@/utils/format";
import type { EventDetail } from "@/types/historyProfiles";
import { ProgressionTimeline } from "@/components/progression/ProgressionTimeline";
import { PlayerOverlaySelector } from "@/components/progression/PlayerOverlaySelector";
import { buildEventLeadProgression } from "@/lib/eventLeadProgression";
import { PodiumMedal } from "@/components/common/PodiumMedal";
import { cn } from "@/lib/cn";
import { TrophyCabinet } from "@/components/common/TrophyCabinet";
import { useMemo, useState } from "react";
import { buildEventPlayerProgressions } from "@/services/playerProgressionOverlayService";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { getRankedPlayers } from "@/data/selectors";

const displayTime = (value: number | null) => value == null ? "—" : formatTime(value / 100);

export function EventResults({ detail }: { detail: EventDetail }) {
  const { data } = useEffectivePublicData();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const podium = detail.podium.filter(({ rank }) => rank != null && rank <= 3);
  const validAttempts = detail.attempts.filter((attempt) => !attempt.isDnf
    && !attempt.isAk && attempt.timeHundredths != null)
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt)
      || left.id.localeCompare(right.id));
  const visualStartAt = validAttempts[0]?.submittedAt;
  const visualEndAt = validAttempts.at(-1)?.submittedAt;
  const eventProgression = buildEventLeadProgression(detail.attempts, visualEndAt ?? null).map((point) => ({ id: point.id, playerId: point.playerId ?? point.guestId ?? undefined, playerName: point.name, avatarUrl: point.avatarUrl, timeHundredths: point.timeHundredths, achievedAt: point.submittedAt, achievedDate: point.submittedAt.slice(0, 10), periodEndAt: point.periodEndAt, eventId: detail.id, sourceLabel: detail.name, improvementHundredths: point.improvementHundredths, durationDays: 0, durationLabel: point.durationLabel, attemptNumber: point.attemptNumber, hasExactTime: true, isCurrent: false }));
  const eventOptions = useMemo(() => {
    const participants = new Map(detail.participantStats.filter((participant) => participant.playerId && !participant.isAk).map((participant) => [participant.playerId!, participant]));
    return getRankedPlayers(data.players, data.leaderboard).flatMap(({ player }) => {
      const participant = participants.get(player.id);
      return participant ? [{ id: player.id, name: participant.name, avatarUrl: participant.avatarUrl }] : [];
    });
  }, [data.leaderboard, data.players, detail.participantStats]);
  const eventOverlays = useMemo(() => buildEventPlayerProgressions(detail.attempts, selectedPlayers), [detail.attempts, selectedPlayers]);
  return (
    <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
      <section className="panel relative order-1 overflow-hidden p-5 sm:p-10">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-gold-400/10 blur-[90px]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              {detail.status === "closed" ? "Beendet" : "Live"}
            </span>
            {detail.isImportant && <span className="flex items-center gap-1 rounded-full border border-gold-400/25 bg-gold-400/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300"><Star className="size-3" /> Wichtiges Event</span>}
            {detail.awardsTrophies && <span className="flex items-center gap-1 rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200"><Trophy className="size-3" /> Trophäen-Event</span>}
          </div>
          <h1 className="display-title mt-4 text-4xl sm:text-6xl">{detail.name}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-white/45"><CalendarDays className="size-4" /> {formatDate(detail.date)}</p>
          {detail.description && <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/55">{detail.description}</p>}
        </div>
      </section>

      <section className="order-2">
        <h2 className="display-title mb-3 text-2xl sm:mb-5 sm:text-3xl">Podium</h2>
        {podium.length ? (
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {podium.map((entry) => {
              const rank = entry.rank as 1 | 2 | 3;
              const card = <><PodiumMedal rank={rank} size={entry.rank === 1 ? "lg" : "md"} className="mx-auto" /><ProfileAvatar id={entry.playerId ?? entry.guestId ?? entry.name} name={entry.name} url={entry.avatarUrl} className={entry.rank === 1 ? "mx-auto mt-3 size-14 ring-gold-400/40 sm:mt-6 sm:size-20" : "mx-auto mt-3 size-11 sm:mt-6 sm:size-16"} /><p className="mt-3 truncate font-display text-base font-black uppercase sm:mt-4 sm:text-2xl">{entry.name}</p><p className="mt-1 hidden text-xs text-white/40 sm:block">{entry.isGuest ? "Gast" : `${entry.attempts} Versuche`}</p><p className="gold-text mt-2 font-display text-xl font-black sm:mt-5 sm:text-4xl">{displayTime(entry.bestHundredths)}</p></>;
              const className = `panel block p-3 text-center transition hover:-translate-y-1 sm:p-6 ${entry.rank === 1 ? "order-2 min-h-52 border-gold-400/25 sm:min-h-80" : entry.rank === 2 ? "order-1 min-h-44 sm:min-h-72" : "order-3 min-h-40 sm:min-h-64"}`;
              return entry.playerId ? <Link key={`${entry.rank}-${entry.playerId}`} to={`/player/${entry.playerId}`} className={className}>{card}</Link> : <article key={`${entry.rank}-${entry.guestId}`} className={className}>{card}</article>;
            })}
          </div>
        ) : <div className="panel py-14 text-center text-sm text-white/40">Keine gültige Eventzeit vorhanden.</div>}
      </section>

      {detail.status === "closed" && <section className="order-3">
        <h2 className="display-title mb-3 text-2xl sm:mb-5 sm:text-3xl">Finale Bestenliste</h2>
        <div className="panel divide-y divide-white/[0.06] overflow-hidden">
          {detail.finalStandings.map((entry) => {
            const placement = entry.rank != null ? `${entry.rank}.` : entry.isAk ? "AK" : "DNF";
            const row = <><span className="w-10 shrink-0 text-center font-display text-xl font-black text-gold-300 sm:w-14 sm:text-2xl">{placement}</span><ProfileAvatar id={entry.playerId ?? entry.guestId ?? entry.name} name={entry.name} url={entry.avatarUrl} className="size-10 shrink-0 sm:size-12" /><div className="min-w-0 flex-1"><p className="truncate font-bold">{entry.name}</p><p className="text-[10px] uppercase tracking-wider text-white/35">{entry.isGuest ? "Gast" : entry.isAk ? "Außer Konkurrenz" : `${entry.attempts} Versuche`}</p></div><span className="shrink-0 font-display text-lg font-black sm:text-2xl">{entry.bestHundredths == null ? "DNF" : displayTime(entry.bestHundredths)}</span></>;
            const className = "flex min-h-16 items-center gap-3 px-3 py-3 sm:min-h-20 sm:gap-4 sm:px-6";
            return entry.playerId ? <Link key={entry.playerId} to={`/player/${entry.playerId}`} className={`${className} transition hover:bg-white/[0.03]`}>{row}</Link> : <div key={entry.guestId ?? entry.name} className={className}>{row}</div>;
          })}
        </div>
      </section>}

      {detail.trophies.length > 0 && <section className="order-4"><h2 className="display-title mb-4 text-2xl sm:text-3xl">Vergebene Trophäen</h2><TrophyCabinet trophies={detail.trophies} mobileLimit={3} /></section>}
      {detail.extras?.errors.trophies && <OptionalEventSectionError className="order-4" message={detail.extras.errors.trophies} />}

      {detail.badges.length > 0 && <section className="order-5 lg:order-4"><h2 className="display-title mb-4 text-2xl sm:mb-5 sm:text-3xl">Freigeschaltet</h2><BadgeGallery badges={detail.badges} compact showPlayer /></section>}
      {detail.extras?.errors.badges && <OptionalEventSectionError className="order-5 lg:order-4" message={detail.extras.errors.badges} />}
      {detail.extras?.loading && <section className="panel order-5 p-4 text-sm text-white/40 lg:order-4">Badges und Trophäen werden nachgeladen …</section>}

      {detail.status === "closed" && <section className="panel order-4 p-4 sm:p-8"><h2 className="display-title text-2xl sm:text-3xl">Event-Führungsprogression</h2><p className="mt-2 text-xs text-white/40 sm:text-sm">Wer führte zu welchem Zeitpunkt mit welcher Eventbestzeit?</p><div className="mt-4 sm:mt-6"><PlayerOverlaySelector options={eventOptions} selectedIds={selectedPlayers} onChange={setSelectedPlayers} /><ProgressionTimeline points={eventProgression} overlaySeries={eventOverlays} primaryLabel="Eventrekord" primaryToggleable domainStartAt={visualStartAt} domainEndAt={visualEndAt} emptyLabel="Dieses Event hat keine gültige Führungszeit." /></div></section>}

      <section className="order-5">
        <h2 className="display-title mb-4 text-2xl sm:mb-5 sm:text-3xl">Eventstatistiken</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric icon={Users} label="Teilnehmer" value={String(detail.participants)} />
          <Metric icon={Timer} label="Gültig" value={String(detail.validAttempts)} />
          <Metric icon={CircleX} label="DNF" value={String(detail.dnfCount)} />
          <Metric icon={Trophy} label="Eventbestzeit" value={displayTime(detail.fastestHundredths)} />
          <Metric icon={Target} label="Durchschnitt" value={displayTime(detail.averageHundredths)} className="col-span-2 lg:col-span-1" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {detail.participantStats.map((participant) => <article key={participant.playerId ?? participant.guestId} className="panel flex items-center gap-4 p-4"><ProfileAvatar id={participant.playerId ?? participant.guestId ?? participant.name} name={participant.name} url={participant.avatarUrl} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{participant.name}</p><p className="text-xs text-white/35">Ø {displayTime(participant.averageHundredths)} · {participant.dnfCount} DNF</p><p className="mt-1 text-[10px] text-gold-200/70">{formatLeadDuration(participant.leadSeconds)} Führung · {participant.eventBestBreaks}× Bestzeit gebrochen</p></div><span className="font-display text-xl font-black">{displayTime(participant.bestHundredths)}</span></article>)}
        </div>
      </section>

      <section className="panel order-6 p-5 sm:p-8"><h2 className="display-title text-2xl sm:text-3xl">Nach Versuchsnummer</h2><p className="mt-2 text-sm text-white/40">Durchschnitt aller gültigen regulären Spieler- und Gastzeiten dieses Events.</p><div className="mt-5 sm:mt-6"><EventAttemptNumberChart points={detail.attemptNumbers} /></div></section>
      <div className="order-7"><EventAttemptList attempts={detail.attempts} /></div>
    </div>
  );
}

function formatLeadDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} Std.${minutes % 60 ? ` ${minutes % 60} Min.` : ""}` : `${minutes} Min.`;
}

function Metric({ icon: Icon, label, value, className }: { icon: typeof Users; label: string; value: string; className?: string }) {
  return <div className={cn("panel min-w-0 p-4 sm:p-5", className)}><Icon className="size-5 text-gold-400" /><p className="mt-4 break-words font-display text-2xl font-black sm:mt-5">{value}</p><p className="mt-1 text-xs text-white/35">{label}</p></div>;
}

function OptionalEventSectionError({ message, className }: { message: string; className?: string }) {
  return <section className={cn("panel p-4 text-sm text-amber-200/80", className)}>{message}</section>;
}
