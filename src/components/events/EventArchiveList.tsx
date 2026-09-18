import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AwardAssetImage } from "@/components/common/AwardAssetImage";
import { trophyCompetitionAssetId } from "@/lib/awardAssets";
import { trophyCompetitionName } from "@/lib/trophyCompetitions";
import type { Event } from "@/types";
import { formatDate, formatTime } from "@/utils/format";
import { resolveEventTheme } from "@/lib/eventTheme";
import { cn } from "@/lib/cn";
import { DenmarkThemeDecoration } from "@/components/events/DenmarkThemeDecoration";

export function EventArchiveList({ events, emptyLabel }: { events: Event[]; emptyLabel: string }) {
  if (events.length === 0) {
    return <p className="panel py-14 text-center text-sm text-white/35">{emptyLabel}</p>;
  }
  return <div className="space-y-3">
    {events.map((event) => {
      const denmark = resolveEventTheme(event) === "denmark";
      return <Link
        key={event.id}
        to={`/events/${event.id}`}
        data-event-theme={denmark ? "denmark" : "default"}
        className={cn("panel group relative grid min-w-0 gap-4 overflow-hidden p-5 transition hover:border-gold-400/25 sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)_auto] sm:items-center sm:gap-7", denmark && "denmark-archive-card")}
      >
        {denmark && <DenmarkThemeDecoration compact />}
        <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2">
          <p className="truncate font-display text-xl font-black uppercase">{event.title}</p>
          {event.awardsTrophies && trophyCompetitionAssetId(
            event.trophyCompetitionKey,
            event.trophyCompetitionYear,
            "gold",
          ) && <AwardAssetImage
            assetId={trophyCompetitionAssetId(
              event.trophyCompetitionKey,
              event.trophyCompetitionYear,
              "gold",
            ) ?? ""}
            alt={`Trophy Event · ${trophyCompetitionName(
              event.trophyCompetitionKey,
              event.trophyCompetitionYear,
            ) ?? "Competition"}`}
            className="visible col-start-2 row-span-2 row-start-1 block size-11 max-w-none shrink-0 self-center sm:size-12"
            fallback={null}
          />}
          <p className="mt-1 text-xs text-white/35">{denmark ? `Dänemark Championship · ${formatDate(event.date)}` : formatDate(event.date)}</p>
        </div>
        <div className="relative grid grid-cols-2 gap-3 sm:contents">
          <EventValue label="Sieger" value={event.winnerNames.join(" & ") || "—"} />
          <EventValue label="Siegerzeit" value={formatTime(event.fastest)} />
          <EventValue label="Teilnehmer" value={String(event.participantIds.length)} />
          <EventValue label="Versuche" value={String(event.attempts)} />
        </div>
        <ChevronRight className="hidden size-5 text-white/20 transition group-hover:translate-x-1 group-hover:text-gold-300 sm:block" />
      </Link>;
    })}
  </div>;
}

function EventValue({ label, value }: { label: string; value: string }) {
  return <p className="min-w-0 text-sm">
    <span className="block text-[9px] uppercase tracking-widest text-white/30">{label}</span>
    <span className="block truncate font-semibold text-white/70">{value}</span>
  </p>;
}
