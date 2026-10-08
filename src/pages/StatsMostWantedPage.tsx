import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useSeason } from "@/hooks/useSeason";
import { OptionalDataState } from "@/components/common/OptionalDataState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { TeamMilestones, TeamMilestoneHistory } from "@/components/stats/TeamMilestones";

export function StatsMostWantedPage() {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  return <div className="space-y-8 sm:space-y-10">
    <PageHeader eyebrow={isAllTime ? "Ewig" : `Saison ${season}`} title="Meilensteine" description="Most Wanted und gemeinsame Team-Meilensteine." action={<SeasonContextBadge />} />
    <StatsNavigation />
    <DataState>
      <section><SectionHeading eyebrow={isAllTime ? "Ewig" : `Saison ${season}`} title="Team-Meilensteine" /><OptionalDataState group="team-milestones">{data.teamMilestones?.season === season && <TeamMilestones snapshot={data.teamMilestones} />}</OptionalDataState></section>
      <section><SectionHeading eyebrow="00 bis 99" title="Most Wanted" /><OptionalDataState group="most-wanted"><MostWantedMatrix data={data.mostWanted} season={season} /></OptionalDataState></section>
      <section><SectionHeading eyebrow={isAllTime ? "Ewig" : `Saison ${season}`} title="Erreichte Meilensteine" /><OptionalDataState group="team-milestones">{data.teamMilestones?.season === season && <TeamMilestoneHistory snapshot={data.teamMilestones} />}</OptionalDataState></section>
    </DataState>
  </div>;
}
