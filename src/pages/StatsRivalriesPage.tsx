import { StatsHeader } from "@/components/stats/StatsHeader";
import { RivalryHubContent } from "@/components/stats/RivalryHubContent";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { Button } from "@/components/ui/button";
import { useRivalryHubV2 } from "@/hooks/useRivalryHubV2";
import { useSeason } from "@/hooks/useSeason";

export function StatsRivalriesPage() {
  const { season } = useSeason();
  const hub = useRivalryHubV2(season);
  return <div className="space-y-8 sm:space-y-10">
    <StatsHeader title="Rivalries" />
    <StatsNavigation />
    <aside className="rounded-2xl border border-red-300/15 bg-red-400/[0.05] p-4 text-sm leading-6 text-white/55"><strong className="text-red-100">Direct Duel ≠ Rivalry:</strong> Jeder direkte Führungswechsel zählt zum Duell. Ab drei Takeovers desselben Paars in einem Event entsteht ein Rivalry-Event.</aside>
    {hub.loading && <p className="panel p-6 text-sm text-white/40" role="status">Rivalry-Historie wird geladen …</p>}
    {hub.error && <div className="panel flex flex-col items-start gap-3 p-6 text-sm text-amber-200/80" role="alert"><p>Rivalry-Historie konnte nicht geladen werden.</p><Button type="button" variant="outline" onClick={hub.retry}>Bereich neu laden</Button></div>}
    {hub.data && <RivalryHubContent data={hub.data} />}
  </div>;
}
