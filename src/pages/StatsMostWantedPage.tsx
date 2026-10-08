import { DataState } from "@/components/common/DataState";
import { StatsHeader } from "@/components/stats/StatsHeader";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useSeason } from "@/hooks/useSeason";
import { OptionalDataState } from "@/components/common/OptionalDataState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { TeamMilestones, TeamMilestoneHistory } from "@/components/stats/TeamMilestones";
import { useMilestoneContent } from "@/hooks/useMilestoneContent";

export function StatsMostWantedPage() {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const content = useMilestoneContent();
  return <div className="space-y-8 sm:space-y-10">
    <StatsHeader title="Meilensteine" />
    <StatsNavigation />
    {content.error && <p role="status" className="text-sm text-amber-200/70">{content.error} Die Meilensteine bleiben ohne Zusatzinhalt verfügbar.</p>}
    <DataState>
      <section><SectionHeading eyebrow={isAllTime ? "Ewig" : `Saison ${season}`} title="Team-Meilensteine" /><OptionalDataState group="team-milestones">{data.teamMilestones?.season === season && <TeamMilestones snapshot={data.teamMilestones} content={content.data} />}</OptionalDataState></section>
      <section><SectionHeading eyebrow="00 bis 99" title="Most Wanted" /><OptionalDataState group="most-wanted"><MostWantedMatrix data={data.mostWanted} season={season} /></OptionalDataState></section>
      <section><SectionHeading eyebrow={isAllTime ? "Ewig" : `Saison ${season}`} title="Erreichte Meilensteine" /><OptionalDataState group="team-milestones">{data.teamMilestones?.season === season && <TeamMilestoneHistory snapshot={data.teamMilestones} content={content.data} />}</OptionalDataState></section>
    </DataState>
  </div>;
}
