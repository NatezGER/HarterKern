import { DataState } from "@/components/common/DataState";
import { OptionalDataState } from "@/components/common/OptionalDataState";
import { StatsHeader } from "@/components/stats/StatsHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { AdminBadgeCatalogSlot } from "@/components/stats/AdminBadgeCatalogSlot";
import { BadgeRarityGrid } from "@/components/stats/BadgeRarityGrid";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useManagementMode } from "@/hooks/useManagementMode";
import { useSeason } from "@/hooks/useSeason";

export function StatsBadgesPage() {
  const { data } = useEffectivePublicData();
  const { isAllTime } = useSeason();
  const { unlocked } = useManagementMode();
  return <div className="space-y-8 sm:space-y-10">
    <StatsHeader title="Badges" />
    <StatsNavigation />
    <DataState>
      <section><SectionHeading eyebrow={isAllTime ? "Prestige" : "All-Time · Prestige"} title="Badge-Seltenheit" /><p className="-mt-4 mb-5 max-w-3xl text-sm leading-6 text-white/45">Anteil der aktiven, dauerhaften Spieler, die diese Schwelle mindestens einmal erreicht haben.</p><OptionalDataState group="badge-rarity"><BadgeRarityGrid badges={data.badgeRarity} /></OptionalDataState></section>
    </DataState>
    <AdminBadgeCatalogSlot unlocked={unlocked} />
  </div>;
}
