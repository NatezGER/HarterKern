import { Flame, Gauge, History, LoaderCircle, Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { cn } from "@/lib/cn";
import { visibleHeadToHeadEvents } from "@/lib/playerCompare";
import type {
  HeadToHeadEvent,
  HeadToHeadStreak,
  HeadToHeadSummary,
} from "@/types/historyProfiles";
import type { DirectRivalrySummary } from "@/types/playerCompare";
import { formatDate, formatTime } from "@/utils/format";

interface HeadToHeadSectionProps {
  playerAName: string;
  playerBName: string;
  data: HeadToHeadSummary | null;
  loading: boolean;
  error: string;
  rivalry?: { data: DirectRivalrySummary | null; loading: boolean; error: string };
}

export function HeadToHeadSection({
  playerAName,
  playerBName,
  data,
  loading,
  error,
  rivalry,
}: HeadToHeadSectionProps) {
  const [expanded, setExpanded] = useState(false);
  if (loading) {
    return <section data-compare-h2h className="panel grid min-h-40 place-items-center border-gold-400/15"><LoaderCircle className="context-accent-text size-6 animate-spin" aria-label="Head to Head wird geladen" /></section>;
  }
  if (error) {
    return <section data-compare-h2h className="panel border-gold-400/15 p-5 text-center text-sm text-amber-100/70">{error}</section>;
  }
  if (!data || data.totalDuels === 0) {
    return (
      <section data-compare-h2h className="panel border-gold-400/15 p-5 sm:p-7">
        <SectionHeading eyebrow="Das direkte Duell" title="Head to Head" />
        <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/10 bg-black/10 p-5 text-center">
          <div><History className="context-accent-text mx-auto size-5" /><p className="mt-3 font-display text-lg font-black uppercase">Noch keine gemeinsamen Duelle</p><p className="mt-1 text-sm text-white/40">Es zählen nur abgeschlossene Events mit einer gültigen Zeit auf beiden Seiten.</p></div>
        </div>
      </section>
    );
  }
  const visibleEvents = visibleHeadToHeadEvents(data.events, expanded);
  return (
    <section data-compare-h2h className="panel overflow-hidden border-gold-400/15 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
      <div className="p-5 pb-4 sm:p-7 sm:pb-5">
        <SectionHeading eyebrow="Das direkte Duell · Rivalry" title="Head to Head" />
        <div className="rounded-3xl border border-white/[0.07] bg-black/15 px-3 py-6 text-center sm:px-6 sm:py-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-6">
            <ScoreName name={playerAName} />
            <p className="context-gradient-text whitespace-nowrap font-display text-4xl font-black tabular-nums sm:text-6xl">
              {data.playerAWins} : {data.playerBWins}
            </p>
            <ScoreName name={playerBName} />
          </div>
          <p className="mt-3 text-xs font-semibold text-white/40 sm:text-sm">
            {data.ties} {data.ties === 1 ? "Unentschieden" : "Unentschieden"} · {data.totalDuels} gemeinsame {data.totalDuels === 1 ? "Duell" : "Duelle"}
          </p>
        </div>

        {rivalry && <DirectRivalryMetrics {...rivalry} playerAName={playerAName} playerBName={playerBName} />}

        {data.rivalry && <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
          <RivalryStat label="Gemeinsame Events" value={data.rivalry.commonEvents} />
          <RivalryStat label="Rivalitäts-Events" value={data.rivalry.rivalryEvents} warm />
          <RivalryStat label="Direkte Wechsel" value={data.rivalry.directTakeovers} />
        </div>}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
          <HighlightCard
            icon={Gauge}
            label="Engstes Duell"
            value={data.closestDuel ? formatDifference(data.closestDuel) : "—"}
            detail={data.closestDuel ? eventDetail(data.closestDuel) : "Noch kein entschiedenes Duell"}
          />
          <HighlightCard
            icon={Trophy}
            label="Größter Sieg"
            value={data.biggestWin ? `${winnerName(data.biggestWin.winner, playerAName, playerBName)} · ${formatDifference(data.biggestWin)}` : "—"}
            detail={data.biggestWin ? eventDetail(data.biggestWin) : "Noch kein entschiedenes Duell"}
          />
          <HighlightCard
            icon={Flame}
            label="Aktuelle Serie"
            value={streakLabel(data.currentStreak, playerAName, playerBName)}
            detail={data.currentStreak ? "Direkt aufeinanderfolgende Siege" : "Keine aktive Siegesserie"}
          />
          <HighlightCard
            icon={History}
            label="Längste Siegesserie"
            value={streakLabel(data.longestStreak, playerAName, playerBName)}
            detail="Im gewählten Zeitraum"
          />
        </div>
      </div>

      <div className="border-t border-white/[0.07]">
        <div className="px-5 pt-5 sm:px-7 sm:pt-6"><h3 className="display-title text-xl sm:text-2xl">Letzte Duelle</h3></div>
        <div className="mt-3">
          {visibleEvents.map((event) => (
            <DuelRow
              key={event.eventId}
              event={event}
              playerAName={playerAName}
              playerBName={playerBName}
            />
          ))}
        </div>
        {data.events.length > 5 && (
          <div className="p-4 text-center sm:p-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Auf fünf Duelle reduzieren" : `Alle ${data.events.length} Duelle anzeigen`}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function DirectRivalryMetrics({
  data,
  loading,
  error,
  playerAName,
  playerBName,
}: {
  data: DirectRivalrySummary | null;
  loading: boolean;
  error: string;
  playerAName: string;
  playerBName: string;
}) {
  if (loading) return <p className="mt-4 text-center text-xs text-white/35">Direkte Rivalry-Zeit wird geladen …</p>;
  if (error || !data) return <p className="mt-4 text-center text-xs text-amber-100/55">{error || "Direkte Rivalry-Werte sind nicht verfügbar."}</p>;
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] sm:mt-5">
      <RivalryRow label="Direkte Führungszeit" left={formatLeadDuration(data.playerALeadSeconds)} right={formatLeadDuration(data.playerBLeadSeconds)} playerAName={playerAName} playerBName={playerBName} />
      <RivalryRow label="Führung direkt abgenommen" left={String(data.playerALeadTakes)} right={String(data.playerBLeadTakes)} playerAName={playerAName} playerBName={playerBName} />
    </div>
  );
}

function RivalryRow({ label, left, right, playerAName, playerBName }: { label: string; left: string; right: string; playerAName: string; playerBName: string }) {
  return (
    <div className="grid min-h-20 grid-cols-[minmax(0,1fr)_minmax(7rem,0.8fr)_minmax(0,1fr)] items-center border-t border-white/[0.06] px-3 first:border-t-0 sm:px-5">
      <div className="min-w-0"><strong className="font-display text-xl tabular-nums sm:text-2xl">{left}</strong><p className="truncate text-[9px] text-white/30">{playerAName}</p></div>
      <p className="px-1 text-center text-[9px] font-black uppercase leading-tight tracking-[0.1em] text-white/40 sm:text-[10px]">{label}</p>
      <div className="min-w-0 text-right"><strong className="font-display text-xl tabular-nums sm:text-2xl">{right}</strong><p className="truncate text-[9px] text-white/30">{playerBName}</p></div>
    </div>
  );
}

function RivalryStat({ label, value, warm = false }: { label: string; value: number; warm?: boolean }) {
  return <div className={cn("min-w-0 rounded-xl border bg-white/[0.025] p-2.5 text-center sm:p-4", warm ? "border-red-400/20 shadow-[0_0_24px_rgba(248,113,113,0.06)]" : "border-white/[0.07]")}><strong className="font-display text-2xl font-black tabular-nums sm:text-3xl">{value}</strong><p className="mt-1 break-words text-[8px] font-bold uppercase leading-tight tracking-wide text-white/40 sm:text-[10px]">{label}</p></div>;
}

function formatLeadDuration(seconds: number) {
  if (seconds < 60) return `${seconds} Sek.`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} Std. ${minutes} Min.` : `${minutes} Min.`;
}

function ScoreName({ name }: { name: string }) {
  return <p className="min-w-0 truncate font-display text-base font-black uppercase sm:text-3xl">{name}</p>;
}

function HighlightCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-5">
      <Icon className="context-accent-text size-4 sm:size-5" />
      <p className="mt-3 text-[8px] font-black uppercase tracking-[0.12em] text-white/35 sm:text-[10px] sm:tracking-[0.16em]">{label}</p>
      <p className="mt-1 break-words font-display text-lg font-black sm:text-2xl">{value}</p>
      <p className="mt-1 break-words text-[10px] leading-relaxed text-white/35 sm:text-xs">{detail}</p>
    </article>
  );
}

function DuelRow({
  event,
  playerAName,
  playerBName,
}: {
  event: HeadToHeadEvent;
  playerAName: string;
  playerBName: string;
}) {
  return (
    <article className="grid min-h-24 grid-cols-[minmax(0,0.8fr)_minmax(7rem,1.4fr)_minmax(0,0.8fr)] items-center border-t border-white/[0.06] px-3 py-3 sm:min-h-28 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,1.5fr)_minmax(0,1fr)] sm:px-7">
      <DuelTime name={playerAName} time={event.playerATimeHundredths} winner={event.winner === "a"} />
      <div className="min-w-0 px-2 text-center sm:px-4">
        <Link to={`/events/${event.eventId}`} className="context-accent-text block truncate text-xs font-bold hover:underline sm:text-sm">{event.eventName}</Link>
        <p className="mt-1 text-[10px] text-white/35 sm:text-xs">{formatDate(event.eventDate)}</p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/35 sm:text-[10px]">
          {event.winner === "tie" ? "Unentschieden" : `${formatDifference(event)} Differenz`}
        </p>
        {event.isRivalryEvent && <span className="mt-2 inline-flex rounded-full border border-red-300/25 bg-red-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-red-100/80">Rivalitäts-Event · {event.directTakeovers} Wechsel</span>}
      </div>
      <DuelTime name={playerBName} time={event.playerBTimeHundredths} winner={event.winner === "b"} align="right" />
    </article>
  );
}

function DuelTime({
  name,
  time,
  winner,
  align = "left",
}: {
  name: string;
  time: number;
  winner: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p className="truncate text-[8px] font-bold uppercase tracking-wide text-white/30 sm:text-[10px]">{name}</p>
      <p className={cn("mt-1 font-display text-lg font-black tabular-nums sm:text-2xl", winner ? "context-accent-text" : "text-white/80")}>{formatTime(time / 100)}</p>
      {winner && <span className="compare-winner-pill mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide sm:px-2 sm:text-[8px]">Vorn</span>}
    </div>
  );
}

function winnerName(winner: HeadToHeadEvent["winner"], playerAName: string, playerBName: string) {
  return winner === "a" ? playerAName : playerBName;
}

function streakLabel(streak: HeadToHeadStreak | null, playerAName: string, playerBName: string) {
  if (!streak) return "—";
  const names = streak.winners.map((winner) => winner === "a" ? playerAName : playerBName);
  return `${names.join(" & ")} ×${streak.length}`;
}

function formatDifference(event: HeadToHeadEvent) {
  return formatTime(event.differenceHundredths / 100);
}

function eventDetail(event: HeadToHeadEvent) {
  return `${event.eventName} · ${formatDate(event.eventDate)}`;
}
