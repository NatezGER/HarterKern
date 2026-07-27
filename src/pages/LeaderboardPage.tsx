import { Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { Podium } from "@/components/leaderboard/Podium";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataState } from "@/components/common/DataState";
import { appMeta } from "@/constants/content";
import { useLeaderboard, type SortOption } from "@/hooks/useLeaderboard";

export function LeaderboardPage() {
  const { entries, query, setQuery, sortBy, setSortBy } = useLeaderboard();

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Hall of Fame" title="Die Besten" description={appMeta.leaderboardDescription} />
      <DataState>
        <div className="space-y-10">
          <section className="panel px-4 pt-8 sm:px-10">
            <Podium />
          </section>
          <section>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="display-title text-3xl">Gesamtrangliste</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block min-w-64">
                  <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Spieler suchen" className="pl-11" />
                </label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger aria-label="Rangliste sortieren"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rank">Nach Rang</SelectItem>
                    <SelectItem value="personalBest">Nach Bestzeit</SelectItem>
                    <SelectItem value="average">Nach Durchschnitt</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" aria-label="Filter vorbereiten"><Filter className="size-4" /> Filter</Button>
              </div>
            </div>
            <LeaderboardList entries={entries} />
          </section>
        </div>
      </DataState>
    </div>
  );
}
