import { Check, Flag, LockKeyhole } from "lucide-react";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { cn } from "@/lib/cn";

export function GroupMilestones() {
  const { data } = useEffectivePublicData();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {data.milestones.map((milestone, index) => {
        const progress = Math.min(100, (milestone.currentCount / milestone.threshold) * 100);
        const next = data.milestones[index + 1];
        return <article key={milestone.key} className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-full bg-gold-400/10 text-gold-300">{milestone.achieved ? <Check className="size-5" /> : <LockKeyhole className="size-4" />}</span><span className="text-xs font-bold text-white/35">{milestone.currentCount.toLocaleString("de-DE")} / {milestone.threshold.toLocaleString("de-DE")}</span></div>
          <h3 className="mt-5 font-display text-2xl font-black uppercase">{milestone.name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-white/40">{milestone.description}</p>
          <div className="mt-5 flex items-end justify-between gap-3 text-[10px] font-bold"><span className="text-white/45">{milestone.achieved ? `${milestone.threshold.toLocaleString("de-DE")} erreicht` : `${milestone.currentCount.toLocaleString("de-DE")} / ${milestone.threshold.toLocaleString("de-DE")} offizielle Zeiten`}</span><span className="text-gold-300">{Math.round(progress)} %</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-white/[0.05] bg-black/30"><div className={cn("h-full rounded-full bg-gradient-to-r from-beer-600 to-gold-300 transition-[width] duration-700", milestone.achieved && "from-emerald-500 to-gold-300")} style={{ width: `${progress}%` }} /></div>
          {milestone.achieved && next && <p className="mt-3 text-[10px] text-white/35">Nächstes Ziel: {next.threshold.toLocaleString("de-DE")}</p>}
          {milestone.achieved && milestone.playerName && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-gold-200"><Flag className="size-3" /> Ausgelöst von {milestone.playerName}</p>}
        </article>;
      })}
    </div>
  );
}
