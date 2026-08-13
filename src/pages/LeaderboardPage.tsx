import { Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { Podium } from "@/components/leaderboard/Podium";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataState } from "@/components/common/DataState";
import { appMeta } from "@/constants/content";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { useSeason } from "@/hooks/useSeason";

export function LeaderboardPage() {
  const { entries, query, setQuery } = useLeaderboard();
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
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="display-title text-3xl">{isAllTime ? "Gesamtrangliste" : `Saisonrangliste ${season}`}</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block min-w-64">
                  <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Spieler suchen" className="pl-11" />
                </label>
                <Button variant="outline" aria-label="Filter vorbereiten"><Filter className="size-4" /> Filter</Button>
              </div>
            </div>
            <LeaderboardList
              entries={entries}
              emptyLabel={!isAllTime && !query.trim()
                ? `Noch keine qualifizierten Zeiten in Saison ${season}.`
                : "Kein Spieler gefunden."}
            />
          </section>
        </div>
      </DataState>
    </div>
  );
}
