import { Check, LockKeyhole } from "lucide-react";
import { MostWantedMatrix } from "@/components/stats/MostWantedMatrix";
import { cn } from "@/lib/cn";
import { buildTrophyEventMilestones } from "@/lib/trophyEventMilestones";
import type { TrophyEventSpecialStats as TrophyEventSpecialStatsData } from "@/types/trophyEventStats";
import { MetricDashboardGrid } from "@/components/stats/MetricTopThreeCard";
import { RivalryPairList } from "@/components/stats/RivalryPairList";

export function TrophyEventSpecialStats({ data, loading, error, className, live = false }: {
  data: TrophyEventSpecialStatsData | null;
  loading: boolean;
  error: string;
  className?: string;
  live?: boolean;
}) {
  if (loading && !data) {
    return <section className={cn("panel p-5 text-sm text-white/40", className)}>
      Trophy-Event-Statistik wird geladen …
    </section>;
  }
  if (error || !data) {
    return <section className={cn("panel p-5 text-sm text-amber-200/80", className)}>
      Event Most Wanted konnte nicht geladen werden.
    </section>;
  }
  const families = buildTrophyEventMilestones(data.metrics);
  return <div className={cn("w-full min-w-0 space-y-6", className)} data-trophy-event-special-stats>
    {data.dashboard && <section aria-label="Trophy-Event-Top-3-Statistiken" className="space-y-3">
      <MetricDashboardGrid metrics={data.dashboard.metrics} />
      {live && <RivalryPairList pairs={data.dashboard.rivalryPairs} live />}
    </section>}
    <MostWantedMatrix
      data={data.mostWanted}
      eventScope={{ eventId: data.eventId, eventName: data.eventName }}
    />
    <section className="panel p-4 sm:p-6" aria-labelledby="event-milestones-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-300">Trophy Event</p>
          <h2 id="event-milestones-heading" className="display-title mt-1 text-2xl sm:text-3xl">Event-Meilensteine</h2>
        </div>
        <p className="text-xs font-bold text-white/40">
          {data.metrics.bingoLines > 0 ? `${data.metrics.bingoLines}× Bingo` : "Bingo noch offen"}
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {families.map((family) => {
          const completed = family.stages.filter(({ achieved }) => achieved).length;
          return <article key={family.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-black uppercase tracking-[0.12em] text-white/75">{family.name}</h3>
              <span className="text-[10px] font-bold text-white/35">{completed}/{family.stages.length}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {family.stages.map((stage) => <span
                key={stage.id}
                title={`${family.name}: ${stage.current} / ${stage.threshold}`}
                className={cn(
                  "inline-flex h-7 min-w-8 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-black tabular-nums",
                  stage.achieved
                    ? "border-emerald-300/25 bg-emerald-300/[0.1] text-emerald-200"
                    : "border-white/[0.07] bg-white/[0.025] text-white/30",
                )}
              >
                {stage.achieved ? <Check className="size-3" /> : <LockKeyhole className="size-3" />}
                {stage.threshold}
              </span>)}
            </div>
            <p className="mt-2 break-words text-[11px] leading-4 text-white/45">{family.detail ?? "Noch kein Treffer"}</p>
          </article>;
        })}
      </div>
    </section>
  </div>;
}
