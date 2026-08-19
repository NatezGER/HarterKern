import { Link } from "react-router-dom";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { BadgeTooltip } from "@/components/common/BadgeTooltip";
import { cn } from "@/lib/cn";
import type { CompactBadge } from "@/types/historyProfiles";
import { formatDate } from "@/utils/format";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { PrestigeBadgeEmblem } from "@/components/common/PrestigeBadgeEmblem";
import { getBadgeMaterialLabel } from "@/lib/badgePresentation";

const styles = {
  bronze: "border-orange-700/30 bg-orange-800/[0.06] text-orange-300",
  silver: "border-slate-300/20 bg-slate-300/[0.05] text-slate-200",
  gold: "border-gold-400/25 bg-gold-400/[0.06] text-gold-300",
  diamond: "border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-200",
  special: "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100",
};

const variantStyles = {
  standard: "",
  positive_special: "border-emerald-300/30 bg-emerald-300/[0.07] text-emerald-100",
  consolation: "border-amber-700/30 bg-amber-900/[0.08] text-amber-200/85",
};

export function BadgeGallery({ badges, compact = false, featured = false, showPlayer = false, mobileLimit, desktopLimit, expanded = false }: { badges: CompactBadge[]; compact?: boolean; featured?: boolean; showPlayer?: boolean; mobileLimit?: number; desktopLimit?: number; expanded?: boolean }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-3", compact && "lg:grid-cols-4")}>
      {badges.map((badge, index) => {
        const collapseClass = !expanded && desktopLimit != null && index >= desktopLimit
          ? "hidden"
          : !expanded && mobileLimit != null && index >= mobileLimit
            ? "hidden sm:block"
            : undefined;
        const displayTier = badge.isSpecialEventBadge ? "special" : badge.tier;
        const badgeLabel = getBadgeMaterialLabel({ tier: displayTier, designVariant: badge.designVariant });
        return <AnimatedCard key={badge.key} delay={Math.min(index * 0.025, 0.2)} className={cn("relative overflow-hidden border p-3 text-center sm:p-5", featured && "sm:px-7 sm:py-8", collapseClass, styles[displayTier], variantStyles[badge.designVariant])}>
          <span className="absolute inset-x-8 -top-16 h-32 rounded-full bg-current opacity-[0.06] blur-3xl" />
          <div className="relative flex min-h-4 items-start justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[0.18em] opacity-65 sm:text-[9px] sm:tracking-[0.2em]">{badgeLabel}</span>{badge.tier === "diamond" && <span className="hidden rounded-full border border-current/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider sm:inline">Ultimativ</span>}{badge.isSpecialEventBadge && <span className="hidden rounded-full border border-current/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider sm:inline">Event-Sonderabzeichen</span>}</div>
          <PrestigeBadgeEmblem badge={{ badgeKey: badge.badgeKey, tier: displayTier, category: badge.category, threshold: badge.threshold, name: badge.name, designVariant: badge.designVariant, valueHundredths: badge.sourceTimeHundredths }} size={compact ? "sm" : featured ? "featured" : "lg"} className="relative mx-auto mt-3" />
          <BadgeTooltip badge={badge} className="mt-3 text-center font-display text-lg font-black uppercase" />
          {showPlayer && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-white/60"><ProfileAvatar id={badge.playerId} name={badge.playerName} url={badge.playerAvatarUrl} className="size-7" /> {badge.playerName}</div>}
          <p className="mt-2 hidden text-xs leading-relaxed text-white/40 sm:block">{badge.requirement}</p>
          <div className="mt-4 hidden flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/30 sm:flex"><span>{formatDate(badge.awardedAt.slice(0, 10))}</span>{badge.sourceAttemptNumber && <span>Versuch {badge.sourceAttemptNumber}</span>}{badge.rarityPercent != null && <span>{badge.rarityPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % Seltenheit</span>}</div>
          {badge.eventId && <Link to={`/events/${badge.eventId}`} className="mt-3 hidden text-xs text-gold-300 hover:underline sm:inline-block">{badge.eventName ?? "Zum Event"}</Link>}
        </AnimatedCard>;
      })}
    </div>
  );
}
