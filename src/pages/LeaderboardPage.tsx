import { PageHeader } from "@/components/common/PageHeader";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { Podium } from "@/components/leaderboard/Podium";
import { DataState } from "@/components/common/DataState";
import { appMeta } from "@/constants/content";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { useSeason } from "@/hooks/useSeason";
import { Button } from "@/components/ui/button";
import { AdvancedHallOfFame } from "@/components/leaderboard/AdvancedHallOfFame";

export function LeaderboardPage() {
  const { entries, mode, setMode } = useLeaderboard();
  const { season, isAllTime } = useSeason();

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={isAllTime ? "Hall of Fame" : `Saison ${season}`} title={isAllTime ? "Die Besten" : "Saison-Hall-of-Fame"} description={isAllTime ? appMeta.leaderboardDescription : `Die schnellsten qualifizierten Einzelzeiten der Saison ${season}.`} action={<SeasonContextBadge />} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Hall-of-Fame-Wertung">
        <Button type="button" variant={mode === "best" ? "default" : "outline"} aria-pressed={mode === "best"} onClick={() => setMode("best")}>Bestzeit</Button>
        <Button type="button" variant={mode === "average" ? "default" : "outline"} aria-pressed={mode === "average"} onClick={() => setMode("average")}>Durchschnitt</Button>
      </div>
      <DataState>
        <div className="space-y-10">
          <section className="panel dk-frame dk-hof-podium px-4 pt-8 sm:px-10">
            <Podium entries={entries} mode={mode} />
          </section>
          <section className="dk-hof-ranking">
            <h2 className="dk-hof-heading display-title mb-5 text-3xl">{mode === "best" ? isAllTime ? "Gesamtrangliste" : `Saisonrangliste ${season}` : isAllTime ? "Durchschnittsrangliste" : `Saison-Durchschnitt ${season}`}</h2>
            <LeaderboardList
              entries={entries}
              mode={mode}
              emptyLabel={isAllTime
                ? "Noch keine qualifizierten Zeiten vorhanden."
                : `Noch keine qualifizierten Zeiten in Saison ${season}.`}
            />
          </section>
        </div>
      </DataState>
      <AdvancedHallOfFame />
    </div>
  );
}
