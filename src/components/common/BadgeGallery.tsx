import { Link } from "react-router-dom";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { BadgeTooltip } from "@/components/common/BadgeTooltip";
import { cn } from "@/lib/cn";
import type { CompactBadge } from "@/types/historyProfiles";
import { formatDate } from "@/utils/format";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { PrestigeBadgeEmblem } from "@/components/common/PrestigeBadgeEmblem";
import { badgeTierLabel } from "@/lib/badgePresentation";

const styles = {
  bronze: "border-orange-700/30 bg-orange-800/[0.06] text-orange-300",
  silver: "border-slate-300/20 bg-slate-300/[0.05] text-slate-200",
  gold: "border-gold-400/25 bg-gold-400/[0.06] text-gold-300",
  diamond: "border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-200",
  special: "border-violet-300/25 bg-violet-300/[0.06] text-violet-200",
};

export function BadgeGallery({ badges, compact = false, featured = false, showPlayer = false }: { badges: CompactBadge[]; compact?: boolean; featured?: boolean; showPlayer?: boolean }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", compact && "lg:grid-cols-4")}>
      {badges.map((badge, index) => {
        const displayTier = badge.isSpecialEventBadge ? "special" : badge.tier;
        return <AnimatedCard key={badge.key} delay={Math.min(index * 0.025, 0.2)} className={cn("relative overflow-hidden border p-5 text-center", featured && "px-7 py-8", styles[displayTier])}>
          <span className="absolute inset-x-8 -top-16 h-32 rounded-full bg-current opacity-[0.06] blur-3xl" />
          <div className="relative flex items-start justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-65">{badgeTierLabel[displayTier]}</span>{badge.tier === "diamond" && <span className="rounded-full border border-current/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">Ultimativ</span>}{badge.isSpecialEventBadge && <span className="rounded-full border border-current/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">Event-Sonderabzeichen</span>}</div>
          <PrestigeBadgeEmblem badge={{ badgeKey: badge.badgeKey, tier: displayTier, category: badge.category, threshold: badge.threshold, name: badge.name }} size={compact ? "sm" : featured ? "featured" : "lg"} className="relative mx-auto mt-3" />
          <BadgeTooltip badge={badge} className="mt-3 text-center font-display text-lg font-black uppercase" />
          {showPlayer && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-white/60"><ProfileAvatar id={badge.playerId} name={badge.playerName} url={badge.playerAvatarUrl} className="size-7" /> {badge.playerName}</div>}
          <p className="mt-2 text-xs leading-relaxed text-white/40">{badge.requirement}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/30"><span>{formatDate(badge.awardedAt.slice(0, 10))}</span>{badge.sourceAttemptNumber && <span>Versuch {badge.sourceAttemptNumber}</span>}{badge.rarityPercent != null && <span>{badge.rarityPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % Seltenheit</span>}</div>
          {badge.eventId && <Link to={`/events/${badge.eventId}`} className="mt-3 inline-block text-xs text-gold-300 hover:underline">{badge.eventName ?? "Zum Event"}</Link>}
        </AnimatedCard>;
      })}
    </div>
  );
}
