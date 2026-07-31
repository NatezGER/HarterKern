import { Crown, History, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { cn } from "@/lib/cn";
import { buildProgressionCoordinates, buildStepPath, formatRecordDuration } from "@/lib/progression";
import { formatDate, formatTime } from "@/utils/format";

export interface TimelinePoint {
  id: string;
  playerId?: string;
  playerName?: string;
  avatarUrl?: string | null;
  timeHundredths: number;
  achievedAt: string;
  achievedDate: string;
  eventId: string | null;
  sourceLabel: string;
  improvementHundredths: number | null;
  durationDays: number;
  isCurrent: boolean;
}

export function ProgressionTimeline({
  points,
  emptyLabel = "Noch keine Progression vorhanden.",
}: {
  points: TimelinePoint[];
  emptyLabel?: string;
}) {
  const plotted = buildProgressionCoordinates(points);
  if (!plotted.length) {
    return <p className="py-14 text-center text-sm text-white/35">{emptyLabel}</p>;
  }
  const path = buildStepPath(plotted);
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-2" aria-hidden="true">
        <div className="relative h-64 min-w-[42rem] overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:12.5%_25%]" />
          <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={path} fill="none" stroke="rgba(245,185,66,.18)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
            <path d={path} fill="none" stroke="rgb(245 185 66)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          {plotted.map((point) => (
            <span
              key={point.id}
              className={cn(
                "absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-[#151612] bg-gold-400 shadow-gold-sm",
                point.isCurrent && "size-5 rotate-45 bg-white",
              )}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            />
          ))}
          <span className="absolute bottom-3 left-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Zeitverlauf</span>
          <TrendingDown className="absolute right-4 top-4 size-5 text-gold-400/40" />
        </div>
      </div>
      <ol className="grid gap-3 lg:grid-cols-2">
        {[...points].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt) || b.id.localeCompare(a.id)).map((point) => (
          <li key={point.id} className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4", point.isCurrent && "border-gold-400/25 bg-gold-400/[0.05]") }>
            <div className="flex items-center gap-3">
              {point.playerId && point.playerName ? (
                <ProfileAvatar id={point.playerId} name={point.playerName} url={point.avatarUrl ?? null} className="size-10" />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-400/10 text-gold-300"><History className="size-4" /></span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bold">{point.playerName ?? point.sourceLabel}</p>
                  {point.isCurrent && <span className="inline-flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black"><Crown className="size-3" /> Aktuell</span>}
                </div>
                <p className="mt-1 text-xs text-white/35">{formatDate(point.achievedDate)} · {point.sourceLabel}</p>
              </div>
              <p className="font-display text-2xl font-black text-gold-300">{formatTime(point.timeHundredths / 100)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.06] pt-3 text-xs text-white/40">
              {point.improvementHundredths != null && <span>{formatTime(point.improvementHundredths / 100)} schneller</span>}
              <span>{formatRecordDuration(point.durationDays)} gehalten</span>
              {point.eventId && <Link to={`/events/${point.eventId}`} className="text-gold-300 hover:underline">Zum Event</Link>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
