import { GlassWater } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { formatTime } from "@/utils/format";

export function SnapEndingCelebration() {
  const { snapEndingCelebration, dismissSnapEndingCelebration } = useLiveEvent();
  const reduced = useReducedMotion();
  if (!snapEndingCelebration) return null;
  return <div className="fixed inset-0 z-[95] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
    <motion.aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="snap-ending-title"
      initial={reduced ? false : { opacity: 0, scale: 0.82, rotate: -3 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      className="w-full max-w-md overflow-hidden rounded-3xl border border-gold-300/40 bg-[#171109]/98 p-7 text-center shadow-[0_0_90px_rgba(231,186,75,.3)] sm:p-9"
    >
      <motion.div
        animate={reduced ? undefined : { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 0.65 }}
        className="mx-auto grid size-16 place-items-center rounded-2xl border border-gold-300/25 bg-gold-300/[0.1] text-gold-300"
      >
        <GlassWater className="size-9" aria-hidden="true" />
      </motion.div>
      <p className="mt-4 text-sm font-semibold text-white/55">{snapEndingCelebration.playerName}</p>
      <h2 id="snap-ending-title" className="display-title gold-text mt-2 text-5xl sm:text-6xl">
        Schnapszahl!
      </h2>
      <p className="mt-3 font-display text-4xl font-black text-white sm:text-5xl">
        {formatTime(snapEndingCelebration.time)}
      </p>
      <Button size="lg" className="mt-7 w-full" onClick={dismissSnapEndingCelebration}>
        Prost & weiter
      </Button>
    </motion.aside>
  </div>;
}
