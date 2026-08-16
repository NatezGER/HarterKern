import { AccessibleTooltip } from "@/components/common/AccessibleTooltip";
import type { CompactBadge } from "@/types/historyProfiles";
import { badgeTierLabel } from "@/lib/badgePresentation";

export function BadgeTooltip({
  badge,
  className,
}: {
  badge: CompactBadge;
  className?: string;
}) {
  return (
    <AccessibleTooltip
      label={`${badge.name} · ${badgeTierLabel[badge.isSpecialEventBadge ? "special" : badge.tier]}`}
      description={`Freischaltbedingung: ${badge.requirement}. Freigeschaltet am ${new Date(badge.awardedAt).toLocaleDateString("de-DE")}. Seltenheit: ${badge.rarityPercent == null ? "noch nicht berechenbar" : `${badge.rarityPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % der Spieler`}.`}
      className={className}
    />
  );
}
