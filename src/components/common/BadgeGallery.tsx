import { Award, Crown, Gem, Medal, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { BadgeTooltip } from "@/components/common/BadgeTooltip";
import { cn } from "@/lib/cn";
import type { CompactBadge } from "@/types/historyProfiles";
import { formatDate } from "@/utils/format";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";

const styles = {
  bronze: "border-orange-700/30 bg-orange-800/[0.06] text-orange-300",
  silver: "border-slate-300/20 bg-slate-300/[0.05] text-slate-200",
  gold: "border-gold-400/25 bg-gold-400/[0.06] text-gold-300",
  diamond: "border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-200",
  special: "border-violet-300/25 bg-violet-300/[0.06] text-violet-200",
};

const icons = { bronze: Medal, silver: Shield, gold: Crown, diamond: Gem, special: Award };

export function BadgeGallery({ badges, compact = false, showPlayer = false }: { badges: CompactBadge[]; compact?: boolean; showPlayer?: boolean }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", compact && "lg:grid-cols-4")}>
      {badges.map((badge, index) => {
        const Icon = icons[badge.tier];
        return <AnimatedCard key={badge.key} delay={Math.min(index * 0.025, 0.2)} className={cn("border p-5", styles[badge.tier])}>
          <div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-full bg-black/25"><Icon className="size-5" /></span><span className="text-[9px] font-black uppercase tracking-[0.18em] opacity-65">{badge.tier}</span></div>
          <BadgeTooltip badge={badge} className="mt-5 text-left font-display text-lg font-black uppercase" />
          {showPlayer && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-white/60"><ProfileAvatar id={badge.playerId} name={badge.playerName} url={badge.playerAvatarUrl} className="size-7" /> {badge.playerName}</div>}
          <p className="mt-2 text-xs leading-relaxed text-white/40">{badge.requirement}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/30"><span>{formatDate(badge.awardedAt.slice(0, 10))}</span>{badge.sourceAttemptNumber && <span>Versuch {badge.sourceAttemptNumber}</span>}{badge.rarityPercent != null && <span>{badge.rarityPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % Seltenheit</span>}</div>
          {badge.eventId && <Link to={`/events/${badge.eventId}`} className="mt-3 inline-block text-xs text-gold-300 hover:underline">{badge.eventName ?? "Zum Event"}</Link>}
        </AnimatedCard>;
      })}
    </div>
  );
}
