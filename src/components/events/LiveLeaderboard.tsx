import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { cn } from "@/lib/cn";
import { getLiveLeaderboardMotion } from "@/lib/liveLeaderboardTransition";
import { formatTime } from "@/utils/format";
import type { LiveLeaderboardTransition, LiveStanding } from "@/types/liveEvent";

function ParticipantName({ standing }: { standing: LiveStanding }) {
  const content = <><LiveAvatar player={standing.player} className="size-10" /><div className="min-w-0"><p className="truncate font-bold">{standing.player.name}</p>{standing.player.kind === "guest" && <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-300">Gast</span>}</div></>;
  return standing.player.kind === "permanent" ? <Link to={`/player/${standing.player.id}`} className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">{content}</Link> : <div className="flex min-w-0 items-center gap-3">{content}</div>;
}

function transitionLabel(transition: LiveLeaderboardTransition) {
  if (transition.tookLead) return "Neue Eventführung";
  if (transition.gainedPositions > 1) return `+${transition.gainedPositions} Plätze`;
  if (transition.gainedPositions === 1) return "+1 Platz";
  return "Neue Bestzeit";
}

export function LiveLeaderboard({ standings, transition, onTransitionComplete }: {
  standings: LiveStanding[];
  transition?: LiveLeaderboardTransition | null;
  onTransitionComplete?: () => void;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const motionConfig = getLiveLeaderboardMotion(reducedMotion);
  const onCompleteRef = useRef(onTransitionComplete);
  onCompleteRef.current = onTransitionComplete;
  useEffect(() => {
    if (!transition) return;
    const timeout = window.setTimeout(() => onCompleteRef.current?.(), motionConfig.completionDelay);
    return () => window.clearTimeout(timeout);
  }, [motionConfig.completionDelay, transition]);

  return <section className="panel overflow-hidden">
    <div className="border-b border-white/[0.07] px-5 py-4 sm:px-7"><h2 className="display-title text-2xl">Live-Rangliste</h2></div>
    <div>{standings.map((standing) => {
      const affected = transition?.playerId === standing.player.id;
      return <motion.div
        layout="position"
        key={standing.player.id}
        transition={{
          layout: { duration: motionConfig.layoutDuration, ease: [0.22, 1, 0.36, 1] },
          backgroundColor: { duration: motionConfig.highlightDuration },
          boxShadow: { duration: motionConfig.highlightDuration },
        }}
        animate={affected && !reducedMotion ? {
          backgroundColor: transition.intensity === "lead"
            ? ["rgba(250,204,21,0)", "rgba(250,204,21,0.12)", "rgba(250,204,21,0.03)"]
            : ["rgba(52,211,153,0)", "rgba(52,211,153,0.09)", "rgba(52,211,153,0.02)"],
          boxShadow: transition.intensity === "lead"
            ? ["inset 0 0 0 rgba(250,204,21,0)", "inset 0 0 34px rgba(250,204,21,0.12)", "inset 0 0 0 rgba(250,204,21,0)"]
            : undefined,
        } : undefined}
        className={cn(
          "grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 border-b border-white/[0.06] px-4 py-4 last:border-0 sm:grid-cols-[3rem_1fr_8rem_8rem] sm:px-7",
          affected && reducedMotion && "bg-emerald-400/[0.06]",
          affected && transition.intensity === "lead" && reducedMotion && "bg-gold-400/[0.09]",
        )}
      >
        <motion.span key={standing.rank ?? "unranked"} initial={affected && !reducedMotion ? { opacity: 0, y: 5 } : false} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl font-black text-gold-400">{standing.rank ? String(standing.rank).padStart(2, "0") : "—"}</motion.span>
        <ParticipantName standing={standing} />
        <p className="hidden text-right text-sm text-white/40 sm:block">{standing.player.kind === "permanent" ? `PB ${formatTime(standing.player.personalBest)}` : "Nur Eventwertung"}</p>
        <div className="text-right">
          <AnimatePresence mode="popLayout" initial={false}><motion.p key={standing.bestTime ?? "no-time"} initial={affected && !reducedMotion ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -6 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="font-display text-xl font-black">{standing.bestTime == null ? "—" : formatTime(standing.bestTime)}</motion.p></AnimatePresence>
          <span className={cn("text-[10px] font-semibold", affected ? "text-emerald-300" : "text-white/35", affected && transition.intensity === "lead" && "text-gold-300")}>
            {affected ? transitionLabel(transition) : standing.rank === 1 ? "Aktueller Leader" : standing.bestTime == null ? "Noch keine Zeit" : "Eventzeit"}
          </span>
        </div>
      </motion.div>;
    })}</div>
    {transition && <p className="sr-only" role="status">{transitionLabel(transition)}: Rang {transition.nextRank}, {formatTime(transition.nextBestTime)}.</p>}
  </section>;
}
