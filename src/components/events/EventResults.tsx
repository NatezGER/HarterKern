import { CalendarDays, CircleX, Medal, Star, Target, Timer, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { EventAttemptList } from "@/components/events/EventAttemptList";
import { EventPhotoGallery } from "@/components/events/EventPhotoGallery";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { BadgeTooltip } from "@/components/common/BadgeTooltip";
import { formatDate, formatTime } from "@/utils/format";
import type { EventDetail } from "@/types/historyProfiles";

const displayTime = (value: number | null) => value == null ? "—" : formatTime(value / 100);

export function EventResults({ detail }: { detail: EventDetail }) {
  const podium = detail.podium.filter(({ rank }) => rank != null && rank <= 3);
  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="panel relative overflow-hidden p-6 sm:p-10">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-gold-400/10 blur-[90px]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              {detail.status === "closed" ? "Beendet" : "Live"}
            </span>
            {detail.isImportant && <span className="flex items-center gap-1 rounded-full border border-gold-400/25 bg-gold-400/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300"><Star className="size-3" /> Wichtiges Event</span>}
          </div>
          <h1 className="display-title mt-4 text-4xl sm:text-6xl">{detail.name}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-white/45"><CalendarDays className="size-4" /> {formatDate(detail.date)}</p>
          {detail.description && <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/55">{detail.description}</p>}
        </div>
      </section>

      <section>
        <h2 className="display-title mb-5 text-3xl">Podium</h2>
        {podium.length ? (
          <div className="grid items-end gap-4 md:grid-cols-3">
            {podium.map((entry) => {
              const card = <><div className="flex items-center justify-between"><Medal className={entry.rank === 1 ? "size-7 text-gold-400" : "size-6 text-white/45"} /><span className="font-display text-3xl font-black">#{entry.rank}</span></div><ProfileAvatar id={entry.playerId ?? entry.guestId ?? entry.name} name={entry.name} url={entry.avatarUrl} className={entry.rank === 1 ? "mt-6 size-20 ring-gold-400/40" : "mt-6 size-16"} /><p className="mt-4 truncate font-display text-2xl font-black uppercase">{entry.name}</p><p className="mt-1 text-xs text-white/40">{entry.isGuest ? "Gast" : `${entry.attempts} Versuche`}</p><p className="gold-text mt-5 font-display text-4xl font-black">{displayTime(entry.bestHundredths)}</p></>;
              const className = `panel block p-6 transition hover:-translate-y-1 ${entry.rank === 1 ? "min-h-80 border-gold-400/25 md:order-2" : entry.rank === 2 ? "min-h-72 md:order-1" : "min-h-64 md:order-3"}`;
              return entry.playerId ? <Link key={`${entry.rank}-${entry.playerId}`} to={`/player/${entry.playerId}`} className={className}>{card}</Link> : <article key={`${entry.rank}-${entry.guestId}`} className={className}>{card}</article>;
            })}
          </div>
        ) : <div className="panel py-14 text-center text-sm text-white/40">Keine gültige Eventzeit vorhanden.</div>}
      </section>

      <section>
        <h2 className="display-title mb-5 text-3xl">Eventstatistiken</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric icon={Users} label="Teilnehmer" value={String(detail.participants)} />
          <Metric icon={Timer} label="Gültig" value={String(detail.validAttempts)} />
          <Metric icon={CircleX} label="DNF" value={String(detail.dnfCount)} />
          <Metric icon={Trophy} label="Eventbestzeit" value={displayTime(detail.fastestHundredths)} />
          <Metric icon={Target} label="Durchschnitt" value={displayTime(detail.averageHundredths)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {detail.participantStats.map((participant) => <article key={participant.playerId ?? participant.guestId} className="panel flex items-center gap-4 p-4"><ProfileAvatar id={participant.playerId ?? participant.guestId ?? participant.name} name={participant.name} url={participant.avatarUrl} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{participant.name}</p><p className="text-xs text-white/35">Ø {displayTime(participant.averageHundredths)} · {participant.dnfCount} DNF</p></div><span className="font-display text-xl font-black">{displayTime(participant.bestHundredths)}</span></article>)}
        </div>
      </section>

      <EventAttemptList attempts={detail.attempts} />
      {detail.badges.length > 0 && <section className="panel p-6"><h2 className="display-title text-3xl">Freigeschaltet</h2><div className="mt-4 flex flex-wrap gap-2">{detail.badges.map((badge) => <BadgeTooltip key={badge.key} badge={badge} className="border border-gold-400/20 bg-gold-400/[0.06] px-4 py-2 text-xs font-bold text-gold-200" />)}</div></section>}
      <EventPhotoGallery eventId={detail.id} photos={detail.photos} />
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <div className="panel p-5"><Icon className="size-5 text-gold-400" /><p className="mt-5 font-display text-2xl font-black">{value}</p><p className="mt-1 text-xs text-white/35">{label}</p></div>;
}
