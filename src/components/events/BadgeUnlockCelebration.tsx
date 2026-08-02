import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { PrestigeBadgeEmblem } from "@/components/common/PrestigeBadgeEmblem";
import { badgeTierLabel } from "@/lib/badgePresentation";

export function BadgeUnlockCelebration() {
  const { badgeUnlock, celebration, dismissBadgeUnlock } = useLiveEvent();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!badgeUnlock || celebration) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissBadgeUnlock();
    };
    window.addEventListener("keydown", dismissOnEscape);
    return () => window.removeEventListener("keydown", dismissOnEscape);
  }, [badgeUnlock, celebration, dismissBadgeUnlock]);
  if (!badgeUnlock || celebration) return null;
  return (
    <motion.aside
      role="status"
      aria-live="assertive"
      initial={reduced ? false : { opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed inset-x-4 bottom-6 z-[85] mx-auto max-w-md rounded-3xl border border-gold-400/30 bg-[#15130e]/95 p-6 text-center shadow-[0_0_70px_rgba(231,186,75,.22)] backdrop-blur-xl"
    >
      <button type="button" aria-label="Badge-Meldung schließen" onClick={dismissBadgeUnlock} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"><X className="size-5" /></button>
      <motion.div animate={reduced ? undefined : { rotate: [0, -4, 4, 0], scale: [1, 1.08, 1] }}><PrestigeBadgeEmblem badge={{ badgeKey: badgeUnlock.badgeKey, tier: badgeUnlock.tier, name: badgeUnlock.name }} size="lg" className="mx-auto" /></motion.div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-gold-300">Badge freigeschaltet · {badgeTierLabel[badgeUnlock.tier]}</p>
      <h2 className="display-title mt-2 text-3xl">{badgeUnlock.name}</h2>
      <p className="mt-2 text-sm text-white/55">{badgeUnlock.playerName}</p>
      <p className="mt-3 text-xs leading-relaxed text-white/40">{badgeUnlock.requirement}</p>
      <button type="button" onClick={dismissBadgeUnlock} className="mt-5 rounded-full bg-gold-400 px-5 py-2 text-xs font-black uppercase tracking-wider text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Weiter</button>
    </motion.aside>
  );
}
