import { AccessibleTooltip } from "@/components/common/AccessibleTooltip";
import type { CompactBadge } from "@/types/historyProfiles";
import { getBadgeMaterialLabel } from "@/lib/badgePresentation";
function requirementSentence(requirement: string) {
  const trimmed = requirement.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function BadgeTooltip({
  badge,
  className,
}: {
  badge: CompactBadge;
  className?: string;
}) {
  return (
    <AccessibleTooltip
      label={`${badge.name} · ${getBadgeMaterialLabel({ tier: badge.isSpecialEventBadge ? "special" : badge.tier, designVariant: badge.designVariant })}`}
      description={`${requirementSentence(badge.requirement)} Seltenheit: ${badge.rarityPercent == null ? "noch nicht berechenbar" : `${badge.rarityPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % der Spieler`}.`}
      showLabelInTooltip={false}
      className={className}
    />
  );
}
