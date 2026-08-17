import { motion, useReducedMotion } from "framer-motion";
import { Check, Crown, Flag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { cn } from "@/lib/cn";
import { formatTime } from "@/utils/format";
import { getPostAttemptInitial } from "@/lib/postAttemptExperience";

export function PostAttemptResult() {
  const { postAttempt, dismissPostAttempt } = useLiveEvent();
  const reduced = useReducedMotion();
  if (!postAttempt) return null;
  const special = ["pb", "event-best", "season-record", "wr"].includes(postAttempt.primaryKind);
  const record = ["season-record", "wr"].includes(postAttempt.primaryKind);
  const Icon = postAttempt.result === "dns" ? Flag : record ? Crown : special ? Sparkles : Check;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/65 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-attempt-title"
        initial={getPostAttemptInitial(Boolean(reduced))}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn(
          "w-full max-w-lg rounded-3xl border bg-[#11130f]/98 p-6 text-center shadow-2xl sm:p-8",
          record ? "border-gold-400/40 shadow-[0_0_80px_rgba(231,186,75,.22)]"
            : special ? "border-emerald-300/25" : "border-white/10",
        )}
      >
        <Icon className={cn("mx-auto size-8", postAttempt.result === "dns"
          ? "text-red-300" : record ? "text-gold-400" : special ? "text-emerald-300" : "text-white/45")} />
        <p className="mt-3 text-sm font-semibold text-white/55">{postAttempt.playerName}</p>
        <h2 id="post-attempt-title" className={cn(
          "mt-2 font-display font-black uppercase",
          postAttempt.result === "dns" ? "text-5xl text-red-200" : "text-5xl sm:text-6xl",
        )}>
          {postAttempt.result === "dns" ? "DNF" : formatTime(postAttempt.time ?? 0)}
        </h2>
        <p className={cn(
          "mt-4 font-display text-xl font-black uppercase tracking-wide",
          postAttempt.primaryKind === "wr" ? "text-gold-300" :
            postAttempt.primaryKind === "season-record" ? "text-emerald-200" : "text-white/80",
        )}>{postAttempt.primaryMessage}</p>
        {postAttempt.improvementHundredths != null && postAttempt.improvementHundredths > 0 && (
          <p className="mt-2 text-sm text-emerald-200">
            {(postAttempt.improvementHundredths / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s schneller
          </p>
        )}
        {postAttempt.achievements.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-white/50">
            {postAttempt.achievements.join(" · ")}
          </p>
        )}
        <Button size="lg" className="mt-7 w-full" onClick={dismissPostAttempt}>Weiter</Button>
      </motion.aside>
    </div>
  );
}
