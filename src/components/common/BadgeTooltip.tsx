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
  const progress = badge.currentProgress == null ? null : badge.category === "performance"
    ? `${(badge.currentProgress / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Sekunden`
    : badge.currentProgress.toLocaleString("de-DE");
  const source = badge.eventName
    ? ` Auslösendes Event: ${badge.eventName}${badge.sourceAttemptNumber ? `, Versuch ${badge.sourceAttemptNumber}` : ""}.`
    : badge.sourceAttemptId || badge.sourceHistoricalAttemptId ? " Ausgelöst durch einen offiziellen Einzelversuch." : "";
  const next = badge.nextBadgeName && badge.nextRequirement
    ? ` Nächste Stufe: ${badge.nextBadgeName} (${badge.nextTier}) – ${badge.nextRequirement}.${progress == null ? "" : ` Aktueller Wert: ${progress}.`}`
    : badge.familyKey && badge.currentProgress != null
      ? " Höchste Stufe dieser Familie erreicht."
      : "";
  return (
    <AccessibleTooltip
      label={`${badge.name} · ${badgeTierLabel[badge.isSpecialEventBadge ? "special" : badge.tier]}`}
      description={`Freischaltbedingung: ${badge.requirement}. Freigeschaltet am ${new Date(badge.awardedAt).toLocaleDateString("de-DE")}.${source} Seltenheit: ${badge.rarityPercent == null ? "noch nicht berechenbar" : `${badge.rarityPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % der Spieler`}.${next}`}
      className={className}
    />
  );
}
