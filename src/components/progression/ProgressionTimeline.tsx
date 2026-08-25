import { Crown, History, TrendingDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { buildProgressionCoordinates, buildStepPath, formatCurrentRecordDuration, formatRecordDuration, formatTimelineMoment } from "@/lib/progression";
import { formatDate, formatTime } from "@/utils/format";

export interface TimelinePoint {
  id: string;
  playerId?: string;
  playerName?: string;
  avatarUrl?: string | null;
  timeHundredths: number;
  achievedAt: string;
  achievedDate: string;
  axisAt?: string;
  periodEndAt?: string;
  eventId: string | null;
  sourceLabel: string;
  improvementHundredths: number | null;
  durationDays: number;
  durationLabel?: string;
  attemptNumber?: number;
  hasExactTime?: boolean;
  isCurrent: boolean;
  distanceToComparisonHundredths?: number | null;
}

type PlottedPoint = TimelinePoint & { x: number; y: number; series: "primary" | "comparison" };

export function ProgressionTimeline({ points, comparisonPoints = [], domainStartAt, domainEndAt, emptyLabel = "Noch keine Progression vorhanden.", primaryLabel = "PB", comparisonLabel = "Weltrekord", comparisonInitiallyVisible = false, compact = false, showHistory = true, primaryCrossoverIds = [], comparisonCrossoverIds = [], historyDisclosure }: {
  points: TimelinePoint[];
  comparisonPoints?: TimelinePoint[];
  domainStartAt?: string;
  domainEndAt?: string;
  emptyLabel?: string;
  primaryLabel?: string;
  comparisonLabel?: string;
  comparisonInitiallyVisible?: boolean;
  compact?: boolean;
  showHistory?: boolean;
  primaryCrossoverIds?: string[];
  comparisonCrossoverIds?: string[];
  historyDisclosure?: { id: string; expanded: boolean };
}) {
  const [showComparison, setShowComparison] = useState(comparisonInitiallyVisible);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const plotted = useMemo(() => {
    const combined = [
      ...points.map((point) => ({ ...point, id: `primary:${point.id}`, originalId: point.id, series: "primary" as const })),
      ...(showComparison ? comparisonPoints.map((point) => ({ ...point, id: `comparison:${point.id}`, originalId: point.id, series: "comparison" as const })) : []),
    ];
    return buildProgressionCoordinates(combined, { startAt: domainStartAt, endAt: domainEndAt }).map(({ originalId, ...point }) => ({ ...point, id: originalId })) as PlottedPoint[];
  }, [comparisonPoints, domainEndAt, domainStartAt, points, showComparison]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPinnedId(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  if (!points.length && (!comparisonPoints.length || !showComparison)) return <p className="py-14 text-center text-sm text-white/35">{emptyLabel}</p>;
  const primary = plotted.filter(({ series }) => series === "primary");
  const comparison = plotted.filter(({ series }) => series === "comparison");
  const visibleTimes = plotted.map(({ timeHundredths }) => timeHundredths);
  const fastestTime = Math.min(...visibleTimes);
  const slowestTime = Math.max(...visibleTimes);
  const orderedDates = [...points, ...(showComparison ? comparisonPoints : [])]
    .sort((a, b) => a.achievedAt.localeCompare(b.achievedAt));
  const activeKey = pinnedId ?? hoveredId;
  const active = plotted.find((point) => `${point.series}:${point.id}` === activeKey) ?? null;
  const primaryCrossovers = new Set(primaryCrossoverIds);
  const comparisonCrossovers = new Set(comparisonCrossoverIds);
  return (
    <div ref={rootRef} className="space-y-5">
      {comparisonPoints.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45"><span className="flex items-center gap-2"><i className="h-0.5 w-7 bg-gold-400" /> {primaryLabel}</span>{showComparison && <span className="flex items-center gap-2"><i className="h-0.5 w-7 border-t-2 border-dashed border-cyan-300" /> {comparisonLabel}</span>}</div>
        <Button type="button" variant={showComparison ? "default" : "outline"} size="sm" onClick={() => { setShowComparison((value) => !value); setPinnedId(null); }}>{showComparison ? `Nur ${primaryLabel}` : `Mit ${comparisonLabel} vergleichen`}</Button>
      </div>}
      <div data-progression-chart className={cn("pb-2", compact ? "overflow-hidden" : "overflow-x-auto")}>
        <div className={cn("relative h-64 overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 sm:h-72", compact ? "min-w-0" : "min-w-[42rem] sm:min-w-[52rem]")}>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:12.5%_25%]" />
          <TimelinePath points={comparison} className="stroke-cyan-300/70" dashed wide />
          <TimelinePath points={primary} className="stroke-gold-400" />
          {[...comparison, ...primary].map((point, _index, all) => {
            const seriesPoints = all.filter(({ series }) => series === point.series);
            const seriesIndex = seriesPoints.findIndex(({ id }) => id === point.id);
            const next = seriesPoints[seriesIndex + 1];
            const segmentEnd = next?.x ?? 93;
            const width = segmentEnd - point.x;
            const previous = seriesPoints[seriesIndex - 1];
            const key = `${point.series}:${point.id}`;
            const isCrossover = point.series === "primary"
              ? primaryCrossovers.has(point.id)
              : comparisonCrossovers.has(point.id);
            return <div key={key}>
              {point.series === "primary" && <span data-timeline-label="duration" className="absolute z-[5] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.05] bg-[#171711]/95 px-1 py-0.5 text-[8px] font-bold text-white/60 sm:px-1.5 sm:text-[9px]" style={{ left: `${Math.max(10, Math.min(90, point.x + width / 2))}%`, top: `${Math.max(2, point.y - (seriesIndex % 2 === 0 ? 13 : 19))}%` }}>{point.durationLabel ?? (point.isCurrent ? formatCurrentRecordDuration(point.durationDays) : formatRecordDuration(point.durationDays))}</span>}
              {point.series === "primary" && previous && point.improvementHundredths != null && <span data-timeline-label="improvement" className="absolute z-[6] -translate-x-full whitespace-nowrap rounded-md border border-gold-400/20 bg-[#171711]/95 px-1 py-0.5 text-[8px] font-black text-gold-300 sm:px-1.5 sm:text-[9px]" style={{ left: `${Math.max(11, point.x - 1)}%`, top: `${Math.max(8, Math.min(84, Math.min(previous.y, point.y) + Math.abs(point.y - previous.y) / 2 + (seriesIndex % 2 === 0 ? 1 : 4)))}%` }}>−{formatTime(point.improvementHundredths / 100)}</span>}
              {isCrossover && <span data-progression-crossover className="absolute z-[8] -translate-x-1/2 rounded-full border border-white/15 bg-[#11130f]/95 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-white/65" style={{ left: `${point.x}%`, top: `${Math.max(3, point.y - 18)}%` }}>Führungswechsel</span>}
              <TimelineNode point={point} active={activeKey === key} crossover={isCrossover} onHover={setHoveredId} onPin={() => setPinnedId((value) => value === key ? null : key)} />
            </div>;
          })}
          <span className="absolute left-3 top-3 rounded bg-black/45 px-1.5 py-0.5 text-[8px] font-bold text-white/30">{formatTime(slowestTime / 100)}</span>
          <span className="absolute bottom-8 left-3 rounded bg-black/45 px-1.5 py-0.5 text-[8px] font-bold text-white/30">{formatTime(fastestTime / 100)}</span>
          <span className="absolute bottom-2 left-3 text-[8px] font-bold uppercase tracking-[0.14em] text-white/25">{formatDate(orderedDates[0].achievedDate)}</span>
          <span className="absolute bottom-2 right-3 text-[8px] font-bold uppercase tracking-[0.14em] text-white/25">{formatDate(orderedDates.at(-1)?.achievedDate ?? orderedDates[0].achievedDate)}</span>
          <TrendingDown className="absolute right-4 top-4 size-5 text-gold-400/40" />
        </div>
      </div>
      <TimelineDetail point={active} pinned={Boolean(pinnedId)} comparisonLabel={comparisonLabel} />
      {showHistory && <ProgressionHistory points={points} disclosure={historyDisclosure} />}
    </div>
  );
}

function ProgressionHistory({ points, disclosure }: { points: TimelinePoint[]; disclosure?: { id: string; expanded: boolean } }) {
  if (!disclosure) return <TimelineHistory points={points} />;
  return <div
    id={disclosure.id}
    data-progression-history={disclosure.expanded ? "expanded" : "collapsed"}
    className={cn(
      "grid transition-[grid-template-rows,opacity] duration-200 sm:grid-rows-[1fr] sm:opacity-100",
      disclosure.expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
    )}
  >
    <div className="overflow-hidden"><TimelineHistory points={points} /></div>
  </div>;
}

function TimelinePath({ points, className, dashed = false, wide = false }: { points: PlottedPoint[]; className: string; dashed?: boolean; wide?: boolean }) {
  if (!points.length) return null;
  const path = `${buildStepPath(points)} H 93`;
  return <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={path} fill="none" strokeWidth={wide ? 8 : 4} className={cn(className, "opacity-15")} vectorEffect="non-scaling-stroke" /><path d={path} fill="none" strokeWidth={wide ? 4 : 2} strokeDasharray={dashed ? "7 5" : undefined} className={className} vectorEffect="non-scaling-stroke" /></svg>;
}

function TimelineNode({ point, active, crossover, onHover, onPin }: { point: PlottedPoint; active: boolean; crossover: boolean; onHover: (id: string | null) => void; onPin: () => void }) {
  const key = `${point.series}:${point.id}`;
  return <button type="button" aria-label={`${point.playerName ?? point.sourceLabel}: ${formatTime(point.timeHundredths / 100)}, ${formatDate(point.achievedDate)}${crossover ? ", Führungswechsel" : ""}`} aria-pressed={active} onMouseEnter={() => onHover(key)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(key)} onBlur={() => onHover(null)} onClick={onPin} className={cn("group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white", point.series === "comparison" ? "size-7 sm:size-9" : "size-8 sm:size-11", point.isCurrent && "ring-2 ring-gold-300 ring-offset-2 ring-offset-[#11130f]", crossover && "ring-2 ring-white ring-offset-2 ring-offset-[#11130f]")} style={{ left: `${point.x}%`, top: `${point.y}%`, marginTop: point.series === "comparison" ? -14 : 0 }}>
    <ProfileAvatar id={point.playerId ?? point.id} name={point.playerName ?? point.sourceLabel} url={point.avatarUrl ?? null} className={cn("size-full border-2 shadow-lg", point.series === "comparison" ? "border-cyan-200/80" : "border-gold-300/80")} />
    <span className={cn("pointer-events-none absolute left-1/2 top-[calc(100%+0.2rem)] -translate-x-1/2 whitespace-nowrap rounded bg-[#10120f]/95 px-1.5 py-0.5 font-display text-[9px] font-black sm:text-[10px]", point.series === "comparison" ? "text-cyan-200" : "text-gold-200")}>{formatTime(point.timeHundredths / 100)}{point.series === "primary" && point.playerName ? <small className="ml-1 hidden font-sans text-[8px] font-semibold text-white/55 sm:inline">{point.playerName}</small> : null}</span>
  </button>;
}

function TimelineDetail({ point, pinned, comparisonLabel }: { point: PlottedPoint | null; pinned: boolean; comparisonLabel: string }) {
  if (!point) return null;
  return <div role="status" className={cn("min-h-24 rounded-2xl border p-4", point.series === "comparison" ? "border-cyan-300/20 bg-cyan-300/[0.04]" : "border-gold-400/20 bg-gold-400/[0.04]")}>
    <div className="flex items-center gap-4"><ProfileAvatar id={point.playerId ?? point.id} name={point.playerName ?? point.sourceLabel} url={point.avatarUrl ?? null} className="size-12" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="font-display text-xl uppercase">{point.playerName ?? point.sourceLabel}</strong>{point.isCurrent && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[8px] font-black uppercase text-black">Aktuell</span>}{pinned && <span className="text-[9px] text-white/35">Fixiert</span>}</div><p className="mt-1 text-xs text-white/45">{formatTimelineMoment(point.achievedAt, point.achievedDate, Boolean(point.hasExactTime))} · {point.sourceLabel}{point.attemptNumber ? ` · Versuch ${point.attemptNumber}` : ""}</p></div><strong className="font-display text-3xl text-gold-300">{formatTime(point.timeHundredths / 100)}</strong></div>
    <div className="mt-3 flex flex-wrap gap-4 border-t border-white/[0.06] pt-3 text-xs text-white/45">
      {point.improvementHundredths != null && <span>−{formatTime(point.improvementHundredths / 100)} Verbesserung</span>}
      <span>{point.durationLabel ?? `${formatRecordDuration(point.durationDays)} gehalten`}</span>
      {point.distanceToComparisonHundredths != null && <span>Abstand zum damaligen {comparisonLabel}: {formatTime(point.distanceToComparisonHundredths / 100)}</span>}
      {point.eventId && <Link to={`/events/${point.eventId}`} className="text-gold-300 hover:underline">Zum Event</Link>}
    </div>
  </div>;
}

function TimelineHistory({ points }: { points: TimelinePoint[] }) {
  return <ol className="grid gap-3 lg:grid-cols-2">{[...points].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt) || b.id.localeCompare(a.id)).map((point) => <li key={point.id} className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4", point.isCurrent && "border-gold-400/25 bg-gold-400/[0.05]")}><div className="flex items-center gap-3">{point.playerId && point.playerName ? <ProfileAvatar id={point.playerId} name={point.playerName} url={point.avatarUrl ?? null} className="size-10" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-400/10 text-gold-300"><History className="size-4" /></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{point.playerName ?? point.sourceLabel}</p>{point.isCurrent && <span className="inline-flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black"><Crown className="size-3" /> Aktuell</span>}</div><p className="mt-1 text-xs text-white/35">{formatDate(point.achievedDate)} · {point.sourceLabel}</p></div><p className="font-display text-2xl font-black text-gold-300">{formatTime(point.timeHundredths / 100)}</p></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.06] pt-3 text-xs text-white/40">{point.improvementHundredths != null && <span>{formatTime(point.improvementHundredths / 100)} schneller</span>}<span>{point.durationLabel ?? `${formatRecordDuration(point.durationDays)} gehalten`}</span>{point.eventId && <Link to={`/events/${point.eventId}`} className="text-gold-300 hover:underline">Zum Event</Link>}</div></li>)}</ol>;
}
