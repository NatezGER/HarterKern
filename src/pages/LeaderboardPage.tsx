import { PageHeader } from "@/components/common/PageHeader";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { Podium } from "@/components/leaderboard/Podium";
import { DataState } from "@/components/common/DataState";
import { appMeta } from "@/constants/content";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { useSeason } from "@/hooks/useSeason";

export function LeaderboardPage() {
  const { entries } = useLeaderboard();
  const { season, isAllTime } = useSeason();

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={isAllTime ? "Hall of Fame" : `Saison ${season}`} title={isAllTime ? "Die Besten" : "Saison-Hall-of-Fame"} description={isAllTime ? appMeta.leaderboardDescription : `Die schnellsten qualifizierten Einzelzeiten der Saison ${season}.`} action={<SeasonContextBadge />} />
      <DataState>
        <div className="space-y-10">
          <section className="panel px-4 pt-8 sm:px-10">
            <Podium />
          </section>
          <section>
            <h2 className="display-title mb-5 text-3xl">{isAllTime ? "Gesamtrangliste" : `Saisonrangliste ${season}`}</h2>
            <LeaderboardList
              entries={entries}
              emptyLabel={isAllTime
                ? "Noch keine qualifizierten Zeiten vorhanden."
                : `Noch keine qualifizierten Zeiten in Saison ${season}.`}
            />
          </section>
        </div>
      </DataState>
    </div>
  );
}
