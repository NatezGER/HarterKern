import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { formatDate } from "@/utils/format";

export function LiveEventBanner() {
  const { activeEvent } = useLiveEvent();
  const elapsed = useElapsedTime(activeEvent?.startedAt ?? new Date().toISOString());
  if (!activeEvent) return null;
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
          <span className="live-marquee inline-block whitespace-nowrap text-white/70">
            {activeEvent.name || "Spieleabend"} · {formatDate(activeEvent.date)} · läuft seit {elapsed}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 font-bold text-white sm:flex">
          Zum Live-Event <ArrowRight className="size-3.5" />
        </span>
      </Link>
    </aside>
  );
}
