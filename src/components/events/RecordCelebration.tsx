import { motion, useReducedMotion } from "framer-motion";
import { Crown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { formatTime } from "@/utils/format";

const confetti = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  left: `${6 + ((index * 29) % 88)}%`,
  delay: (index % 7) * 0.08,
  color: index % 3 === 0 ? "bg-white" : index % 2 === 0 ? "bg-emerald-300" : "bg-gold-400",
}));

export function RecordCelebration() {
  const { celebration, postAttempt, dismissCelebration } = useLiveEvent();
  const reduced = useReducedMotion();
  if (!celebration || postAttempt) return null;
  const worldRecord = celebration.kind === "wr";
  const seasonRecord = celebration.kind === "season";
  return (
    <motion.aside
      role="status"
      aria-live="assertive"
      initial={reduced ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-x-4 top-28 z-[80] mx-auto max-w-xl overflow-hidden rounded-3xl border border-gold-400/35 bg-[#15110a]/95 p-7 text-center shadow-[0_0_80px_rgba(231,186,75,.28)] backdrop-blur-xl"
    >
      {!reduced && confetti.map((piece) => (
        <motion.span
          key={piece.id}
          aria-hidden="true"
          className={`absolute -top-4 size-2 rounded-sm ${piece.color}`}
          style={{ left: piece.left }}
          initial={{ y: -10, rotate: 0, opacity: 0 }}
          animate={{ y: 280, rotate: 260, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.4, delay: piece.delay, ease: "easeOut" }}
        />
      ))}
      <button
        type="button"
        aria-label="Rekordmeldung schließen"
        onClick={dismissCelebration}
        className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
      >
        <X className="size-5" />
      </button>
      {worldRecord || seasonRecord ? <Crown className="mx-auto size-10 text-gold-400" /> : <Sparkles className="mx-auto size-8 text-emerald-300" />}
      <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-gold-300">
        {worldRecord ? "Neuer Weltrekord" : seasonRecord
          ? `Neuer Saisonrekord ${celebration.seasonYear}` : "Neue persönliche Bestzeit"}
      </p>
      <h2 className="display-title mt-2 text-4xl">{celebration.playerName}</h2>
      <p className="gold-text mt-2 font-display text-5xl font-black">{formatTime(celebration.time)}</p>
      {celebration.previousTime && (
        <p className="mt-3 text-xs text-white/40">Vorheriger Rekord: {formatTime(celebration.previousTime)}</p>
      )}
      <Button className="mt-5" onClick={dismissCelebration}>Weiter</Button>
    </motion.aside>
  );
}
