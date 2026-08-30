import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { formatDate, formatTime } from "@/utils/format";
import { getAttemptMilestones } from "@/lib/liveEventCalculations";

export function LiveEventBanner() {
  const { activeEvent, state } = useLiveEvent();
  const elapsed = useElapsedTime(activeEvent?.startedAt ?? new Date().toISOString());
  if (!activeEvent) return null;
  const attempts = state.attempts
    .filter(({ eventId }) => eventId === activeEvent.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const milestones = getAttemptMilestones(state.players, state.attempts);
  const best = attempts
    .filter((attempt) => !attempt.outOfCompetition && attempt.result === "time")
    .sort((a, b) => (a.timeSeconds ?? Infinity) - (b.timeSeconds ?? Infinity))[0];
  const seasonBest = [...state.attempts]
    .filter((attempt) => !attempt.outOfCompetition && attempt.result === "time")
    .sort((a, b) => (a.timeSeconds ?? Infinity) - (b.timeSeconds ?? Infinity))[0];
  const attemptText = (attempt: (typeof attempts)[number]) => {
    const player = state.players.find(({ id }) => id === attempt.playerId);
    return `${player?.name ?? "Spieler"} ${attempt.result === "dns" ? "DNF" : formatTime(attempt.timeSeconds ?? 0)}`;
  };
  const items = [
    activeEvent.name || "Spieleabend",
    formatDate(activeEvent.date),
    ...attempts.slice(0, 3).map(attemptText),
    best ? `Tagesbestzeit: ${attemptText(best)}` : "Noch keine Tagesbestzeit",
    seasonBest ? `Saisonrekord: ${attemptText(seasonBest)}` : "Noch kein Saisonrekord",
    ...attempts.filter((attempt) => milestones.get(attempt.id)?.isPersonalBest).slice(0, 1).map((attempt) => `Neue PB: ${attemptText(attempt)}`),
    ...attempts.filter((attempt) => milestones.get(attempt.id)?.isWorldRecord).slice(0, 1).map((attempt) => `🏆 Neuer Weltrekord: ${attemptText(attempt)}`),
    `Läuft seit ${elapsed}`,
  ];
  return (
    <aside className="sticky top-20 z-30 border-b border-red-400/20 bg-[#160b0b]/95 backdrop-blur-xl">
      <Link
        to="/events/live"
        className="mx-auto flex min-h-12 max-w-[1600px] items-center gap-3 overflow-hidden px-5 py-2 text-xs sm:px-8 lg:px-12"
      >
        <span className="flex shrink-0 items-center gap-2 font-black uppercase tracking-[0.16em] text-red-300">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-400" />
          </span>
          Live
        </span>
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="live-ticker-track flex w-max items-center whitespace-nowrap text-white/70">
            {[...items, ...items].map((item, index) => (
              <span key={`${item}-${index}`} aria-hidden={index >= items.length} className="px-5">{item}</span>
            ))}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 font-bold text-white sm:flex">
          Zum Live-Event <ArrowRight className="size-3.5" />
        </span>
      </Link>
    </aside>
  );
}
