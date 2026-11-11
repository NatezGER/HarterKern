import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { formatDate, formatTime } from "@/utils/format";
import { getLiveTickerMoments } from "@/lib/liveTickerMoments";
import { RecordEmblem } from "@/components/common/RecordEmblem";
import { resolveEventTheme } from "@/lib/eventTheme";
import { cn } from "@/lib/cn";

export function LiveEventBanner() {
  const { activeEvent, state } = useLiveEvent();
  const elapsed = useElapsedTime(activeEvent?.startedAt ?? new Date().toISOString());
  const today = new Date().toDateString();
  const moments = useMemo(() => activeEvent ? getLiveTickerMoments(state, activeEvent, new Date(today)) : [], [state, activeEvent, today]);
  if (!activeEvent) return null;
  const denmark = resolveEventTheme(activeEvent) === "denmark";
  const attempts = state.attempts
    .filter(({ eventId }) => eventId === activeEvent.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const attemptText = (attempt: (typeof attempts)[number]) => {
    const player = state.players.find(({ id }) => id === attempt.playerId);
    return `${player?.name ?? "Spieler"} ${attempt.result === "dns" ? "DNF" : formatTime(attempt.timeSeconds ?? 0)}`;
  };
  const items = [
    activeEvent.name || "Spieleabend",
    formatDate(activeEvent.date),
    ...attempts.slice(0, 3).map(attemptText),
    ...moments.map(({ kind, attempt }) => <span className="inline-flex items-center gap-2" key={kind}><RecordEmblem kind={kind} className="size-7" />{attemptText(attempt)}</span>),
    `Läuft seit ${elapsed}`,
  ];
  return (
    <aside className={cn("sticky top-20 z-30 border-b border-red-400/20 bg-[#160b0b]/95 backdrop-blur-xl", denmark && "denmark-live-banner")}>
      <Link
        to="/events/live"
        className="viewport-gutter mx-auto flex min-h-12 min-w-0 max-w-[1600px] items-center gap-3 overflow-hidden py-2 text-xs"
      >
        <span className="flex shrink-0 items-center gap-2 font-black uppercase tracking-[0.16em] text-red-300">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-400" />
          </span>
          {denmark ? "Dänemark live" : "Live"}
        </span>
        <span className="min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
          <span className="live-ticker-track motion-reduce:animate-none flex w-max items-center whitespace-nowrap text-white/70">
            {[...items, ...items].map((item, index) => (
              <span key={index} aria-hidden={index >= items.length} className={`px-5 ${index >= items.length ? "motion-reduce:hidden" : ""}`}>{item}</span>
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
