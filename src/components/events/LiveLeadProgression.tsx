import { Crown, TrendingDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { cn } from "@/lib/cn";
import {
  buildEventLeadProgression,
  type EventLeadAttempt,
} from "@/lib/eventLeadProgression";
import { buildProgressionCoordinates, buildStepPath } from "@/lib/progression";
import { formatTime } from "@/utils/format";

const formatMoment = (value: string) => new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
}).format(new Date(value));

export function LiveLeadProgression({
  attempts,
  eventStartedAt,
  highlightAttemptId,
}: {
  attempts: EventLeadAttempt[];
  eventStartedAt: string;
  highlightAttemptId?: string;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const [nowAt, setNowAt] = useState(() => new Date().toISOString());
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    const interval = window.setInterval(() => setNowAt(new Date().toISOString()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const points = useMemo(
    () => buildEventLeadProgression(attempts, null, nowAt),
    [attempts, nowAt],
  );
  const current = points.at(-1);
  const active = points.find(({ id }) => id === activeId) ?? current;
  useEffect(() => {
    if (highlightAttemptId) setActiveId(highlightAttemptId);
  }, [highlightAttemptId]);
  const plotted = useMemo(
    () => buildProgressionCoordinates(
      points.map((point) => ({ ...point, achievedAt: point.submittedAt })),
      { startAt: eventStartedAt, endAt: nowAt },
    ),
    [eventStartedAt, nowAt, points],
  );
  const path = plotted.length ? `${buildStepPath(plotted)} H 93` : "";
  const chartWidth = Math.max(720, plotted.length * 190);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-white/[0.07] px-5 py-4 sm:px-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300">
          Kompletter Verlauf
        </p>
        <h2 className="display-title mt-1 text-2xl">Live-Führungsstory</h2>
      </div>
      {!current ? (
        <p className="px-5 py-12 text-center text-sm text-white/40">
          Noch keine gültige Führungszeit.
        </p>
      ) : (
        <>
          <motion.div
            animate={highlightAttemptId === current.id && !reducedMotion
              ? { boxShadow: ["0 0 0 rgba(250,204,21,0)", "0 0 42px rgba(250,204,21,0.16)", "0 0 0 rgba(250,204,21,0)"] }
              : undefined}
            transition={{ duration: 1.15 }}
            className="m-4 rounded-2xl border border-gold-400/20 bg-gradient-to-br from-gold-400/[0.10] to-emerald-400/[0.04] p-4 sm:m-6 sm:p-5"
          >
            <div className="flex items-center gap-4">
              <ProfileAvatar
                id={current.playerId ?? current.guestId ?? current.id}
                name={current.name}
                url={current.avatarUrl}
                className="size-14 ring-2 ring-gold-400/30"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-gold-300">
                  <Crown className="size-3.5" /> Aktueller Leader
                </p>
                <h3 className="mt-1 truncate font-display text-2xl font-black uppercase">
                  {current.name}
                </h3>
                <p className="mt-1 text-xs text-white/45">{current.durationLabel}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-black text-gold-200">
                  {formatTime(current.timeHundredths / 100)}
                </p>
                {current.improvementHundredths != null && (
                  <p className="mt-1 text-xs font-bold text-emerald-300">
                    −{formatTime(current.improvementHundredths / 100)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          <div
            data-live-lead-curve
            data-lead-points={plotted.length}
            className="overflow-x-auto overscroll-x-contain px-4 pb-3 touch-pan-x sm:px-6"
          >
            <div
              className="relative h-80 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/25 sm:h-96"
              style={{ width: chartWidth }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:12.5%_25%]" />
              <svg
                aria-hidden="true"
                className="absolute inset-0 size-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {plotted.map((point) => (
                  <line
                    key={`guide-${point.id}`}
                    x1="7"
                    x2="93"
                    y1={point.y}
                    y2={point.y}
                    className="stroke-white/[0.05]"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <motion.path
                  key={plotted.map(({ id }) => id).join(":")}
                  d={path}
                  fill="none"
                  strokeWidth="10"
                  className="stroke-gold-400/10"
                  vectorEffect="non-scaling-stroke"
                  initial={highlightAttemptId && !reducedMotion ? { pathLength: 0.85 } : false}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.55 }}
                />
                <motion.path
                  key={`line-${plotted.map(({ id }) => id).join(":")}`}
                  d={path}
                  fill="none"
                  strokeWidth="3"
                  className="stroke-gold-300"
                  vectorEffect="non-scaling-stroke"
                  initial={highlightAttemptId && !reducedMotion ? { pathLength: 0.85 } : false}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.55 }}
                />
              </svg>

              {plotted.map((point, index) => {
                const isCurrent = index === plotted.length - 1;
                const highlighted = point.id === highlightAttemptId;
                return (
                  <motion.button
                    type="button"
                    key={point.id}
                    aria-label={`${point.name}: ${formatTime(point.timeHundredths / 100)} um ${formatMoment(point.submittedAt)}, ${point.durationLabel}`}
                    aria-pressed={active?.id === point.id}
                    onClick={() => setActiveId(point.id)}
                    initial={highlighted && !reducedMotion ? { opacity: 0, scale: 0.65 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.18 }}
                    className={cn(
                      "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                      isCurrent ? "size-12" : "size-10",
                    )}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  >
                    <ProfileAvatar
                      id={point.playerId ?? point.guestId ?? point.id}
                      name={point.name}
                      url={point.avatarUrl}
                      className={cn(
                        "size-full border-2 border-gold-300 shadow-lg",
                        isCurrent && "ring-4 ring-gold-400/20",
                      )}
                    />
                    <span className={cn(
                      "absolute left-1/2 top-[calc(100%+0.25rem)] -translate-x-1/2 whitespace-nowrap rounded-md border bg-[#11130f]/95 px-1.5 py-0.5 font-display text-[10px] font-black",
                      isCurrent
                        ? "border-gold-400/30 text-gold-200"
                        : "border-white/[0.08] text-white/75",
                    )}>
                      {formatTime(point.timeHundredths / 100)}
                      {isCurrent && <small className="ml-1 font-sans text-[8px] uppercase">Aktuell</small>}
                    </span>
                  </motion.button>
                );
              })}

              <span className="absolute bottom-2 left-[7%] text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">
                Eventstart
              </span>
              <span className="absolute bottom-2 right-[7%] text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">
                Jetzt
              </span>
            </div>
          </div>

          {active && (
            <div data-live-lead-detail className="mx-4 mb-5 rounded-2xl border border-gold-400/15 bg-gold-400/[0.04] p-4 sm:mx-6 sm:mb-6">
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  id={active.playerId ?? active.guestId ?? active.id}
                  name={active.name}
                  url={active.avatarUrl}
                  className="size-11"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-display text-lg font-black uppercase">{active.name}</p>
                    {active.id === current.id && (
                      <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[8px] font-black uppercase text-black">
                        Aktuell
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    {formatMoment(active.submittedAt)} Uhr
                    {active.attemptNumber ? ` · Versuch ${active.attemptNumber}` : ""}
                  </p>
                </div>
                <p className="font-display text-2xl font-black text-gold-200">
                  {formatTime(active.timeHundredths / 100)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.06] pt-3 text-xs text-white/45">
                <span>{active === points[0] ? "Erste Führung" : active.durationLabel}</span>
                {active.improvementHundredths != null && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                    <TrendingDown className="size-3.5" />
                    −{formatTime(active.improvementHundredths / 100)} Verbesserung
                  </span>
                )}
                {active === points[0] && <span>{active.durationLabel}</span>}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
