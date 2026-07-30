import { AccessibleTooltip } from "@/components/common/AccessibleTooltip";
import type { CompactBadge } from "@/types/historyProfiles";

export function BadgeTooltip({
  badge,
  className,
}: {
  badge: CompactBadge;
  className?: string;
}) {
  return (
    <AccessibleTooltip
      label={`${badge.name} · ${badge.tier}`}
      description={`Freischaltbedingung: ${badge.description}`}
      className={className}
    />
  );
}
