import { Crown, TrendingDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { cn } from "@/lib/cn";
import {
  buildEventLeadProgression,
  type EventLeadAttempt,
} from "@/lib/eventLeadProgression";
import { formatTime } from "@/utils/format";

const formatMoment = (value: string) => new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));

export function LiveLeadProgression({
  attempts,
  highlightAttemptId,
}: {
  attempts: EventLeadAttempt[];
  highlightAttemptId?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [nowAt, setNowAt] = useState(() => new Date().toISOString());
  useEffect(() => {
    const interval = window.setInterval(() => setNowAt(new Date().toISOString()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const points = useMemo(
    () => buildEventLeadProgression(attempts, null, nowAt),
    [attempts, nowAt],
  );
  const current = points.at(-1);

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

          <div className="px-4 pb-5 sm:overflow-x-auto sm:px-6 sm:pb-6">
            <ol className="relative space-y-3 border-l border-gold-400/20 pl-5 sm:flex sm:min-w-max sm:space-y-0 sm:border-l-0 sm:border-t sm:pl-0 sm:pt-5">
              {points.map((point, index) => {
                const isCurrent = index === points.length - 1;
                const highlighted = point.id === highlightAttemptId;
                return (
                  <motion.li
                    key={point.id}
                    initial={highlighted && !reducedMotion ? { opacity: 0, y: 10 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.4 }}
                    className={cn(
                      "relative rounded-xl border p-3 sm:w-56 sm:shrink-0 sm:rounded-none sm:border-y-0 sm:border-l-0 sm:border-r sm:px-5 sm:py-1",
                      isCurrent
                        ? "border-gold-400/25 bg-gold-400/[0.07] sm:bg-transparent"
                        : "border-white/[0.07] bg-white/[0.025] sm:bg-transparent",
                    )}
                  >
                    <span className="absolute -left-[1.58rem] top-5 size-2.5 rounded-full border-2 border-[#11130f] bg-gold-400 sm:-top-[1.57rem] sm:left-5" />
                    <div className="flex items-center gap-3">
                      <ProfileAvatar
                        id={point.playerId ?? point.guestId ?? point.id}
                        name={point.name}
                        url={point.avatarUrl}
                        className="size-9"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{point.name}</p>
                        <p className="text-[10px] text-white/35">
                          {formatMoment(point.submittedAt)}
                          {point.attemptNumber ? ` · Versuch ${point.attemptNumber}` : ""}
                        </p>
                      </div>
                      <p className="font-display text-xl font-black text-gold-200">
                        {formatTime(point.timeHundredths / 100)}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/40">
                      <span>{index === 0
                        ? `Erste Führung · ${point.durationLabel}` : point.durationLabel}</span>
                      {point.improvementHundredths != null && (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                          <TrendingDown className="size-3" />
                          −{formatTime(point.improvementHundredths / 100)}
                        </span>
                      )}
                      {isCurrent && <span className="font-bold text-gold-300">Aktuell</span>}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}
