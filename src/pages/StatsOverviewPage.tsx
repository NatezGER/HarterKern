import { Link } from "react-router-dom";
import { ArrowRight, Swords } from "lucide-react";
import { DataState } from "@/components/common/DataState";
import { StatsHeader } from "@/components/stats/StatsHeader";
import { BeerMilestoneProgress } from "@/components/stats/TeamMilestones";
import { useMilestoneContent } from "@/hooks/useMilestoneContent";
import { StatCard } from "@/components/stats/StatCard";
import { StatsNavigation } from "@/components/stats/StatsNavigation";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useRivalryHub } from "@/hooks/useRivalryHub";
import { useSeason } from "@/hooks/useSeason";
import { Button } from "@/components/ui/button";

export function StatsOverviewPage() {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const rivalry = useRivalryHub(season, false);
  const content = useMilestoneContent();
  const validAttempts = Number(data.statistics.find(({ id }) => id === "community-valid")?.value ?? 0);
  return <div className="space-y-8 sm:space-y-10">
    <StatsHeader title="Statistiken" />
    <StatsNavigation />
    <DataState>
      {data.statisticsSeason === season ? <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <BeerMilestoneProgress validAttempts={validAttempts} scope={isAllTime ? "All-Time" : `Saison ${season}`} content={content.data} />
        <div className="grid min-w-0 content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {data.statistics.filter(({ id }) => ["players", "guests", "closed-events"].includes(id)).map((statistic) => <StatCard key={statistic.id} statistic={statistic} />)}
        </div>
      </section> : <p role="status" className="text-sm text-white/45">Scope-Fakten werden geladen …</p>}
      <section className="panel overflow-hidden p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-200/70">Head to Head</p><h2 className="display-title mt-2 text-3xl sm:text-4xl">Rivalries</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Direkte Führungswechsel, Rivalry-Events und die intensivsten Duelle der Liga.</p></div>
          <Button asChild><Link to="/stats/rivalries">Alle Rivalries ansehen <ArrowRight className="size-4" /></Link></Button>
        </div>
        {rivalry.loading && <p className="mt-6 text-sm text-white/35" role="status">Rivalry-Überblick wird geladen …</p>}
        {rivalry.error && <div className="mt-6 flex items-center gap-3 text-sm text-amber-200/75" role="alert"><span>Rivalry-Überblick nicht verfügbar.</span><button type="button" onClick={rivalry.retry} className="underline">Neu laden</button></div>}
        {rivalry.data && <div className="mt-6 grid grid-cols-3 gap-3"><TeaserStat label="Rivalry-Events" value={rivalry.data.summary.rivalryEvents} /><TeaserStat label="Rivalry-Spieler" value={rivalry.data.summary.playersWithRivalry} /><TeaserStat label="Direkte Takeovers" value={rivalry.data.summary.directTakeovers} /></div>}
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <AreaCard to="/stats/performance" title="Performance" text="Rekorde, Progression, Konstanz und Event-Performance." />
        <AreaCard to="/stats/milestones" title="Meilensteine" text="Most Wanted, gemeinsam getrunken und Top-10-Teamzeit." />
        <AreaCard to="/stats/badges" title="Badges" text="Badge-Familien, Stufen, Empfänger und Seltenheit." />
      </section>
    </DataState>
  </div>;
}

function TeaserStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4"><Swords className="size-4 text-red-200/70" /><p className="mt-3 font-display text-2xl font-black">{value}</p><p className="mt-1 text-[10px] text-white/35 sm:text-xs">{label}</p></div>;
}
function AreaCard({ to, title, text }: { to: string; title: string; text: string }) {
  return <Link to={to} className="panel group block p-5 transition hover:border-gold-300/20 sm:p-6"><h3 className="font-display text-2xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-white/40">{text}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase text-gold-200">Öffnen <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span></Link>;
}
