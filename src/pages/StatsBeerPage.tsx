import { DataState } from "@/components/common/DataState";
import { OptionalDataState } from "@/components/common/OptionalDataState";
import { StatsHeader } from "@/components/stats/StatsHeader";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { BeerStatisticsContent } from "@/components/stats/BeerStatisticsContent";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useSeason } from "@/hooks/useSeason";

export function StatsBeerPage() {
  const { data } = useEffectivePublicData();
  const { season } = useSeason();
  const beer = data.beerStatistics;
  return <div className="min-w-0 space-y-8 sm:space-y-10">
    <StatsHeader title="Bier" />
    <StatsNavigation />
    <DataState><OptionalDataState group="beer-statistics">
      {beer?.season === season && (beer.summary.attempts === 0
        ? <p className="panel p-6 text-sm text-white/50">Für diesen Zeitraum wurden noch keine Biersorten dokumentiert.</p>
        : <BeerStatisticsContent data={beer} />)}
    </OptionalDataState></DataState>
  </div>;
}
