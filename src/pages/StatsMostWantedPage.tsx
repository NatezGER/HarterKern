import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useSeason } from "@/hooks/useSeason";

export function StatsMostWantedPage() {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  return <div className="space-y-8 sm:space-y-10">
    <PageHeader eyebrow={isAllTime ? "00 bis 99 · All-Time" : `00 bis 99 · Saison ${season}`} title="Most Wanted" description="Die Jagd nach allen hundert Endziffern." action={<SeasonContextBadge />} />
    <StatsNavigation />
    <DataState><MostWantedMatrix data={data.mostWanted} season={season} /></DataState>
  </div>;
}
