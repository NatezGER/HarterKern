import { Check, Flag, LockKeyhole } from "lucide-react";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { cn } from "@/lib/cn";
import { calculateMilestoneProgress } from "@/lib/milestoneProgress";

export function GroupMilestones() {
  const { data } = useEffectivePublicData();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {data.milestones.map((milestone, index) => {
        const progress = calculateMilestoneProgress(milestone.currentCount, milestone.threshold);
        const next = data.milestones[index + 1];
        return <article key={milestone.key} className="panel min-w-0 p-3 sm:p-6">
          <div className="flex items-center justify-between gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-400/10 text-gold-300 sm:size-10">{milestone.achieved ? <Check className="size-5" /> : <LockKeyhole className="size-4" />}</span><span className="break-words text-right text-[10px] font-bold text-white/35 sm:text-xs">{milestone.currentCount.toLocaleString("de-DE")} / {milestone.threshold.toLocaleString("de-DE")}</span></div>
          <h3 className="mt-4 break-words font-display text-xl font-black uppercase sm:mt-5 sm:text-2xl">{milestone.name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-white/40">{milestone.description}</p>
          <div className="mt-5 flex items-end justify-between gap-3 text-[10px] font-bold"><span className="text-white/45">{milestone.achieved ? `${milestone.threshold.toLocaleString("de-DE")} erreicht` : `${milestone.currentCount.toLocaleString("de-DE")} / ${milestone.threshold.toLocaleString("de-DE")} offizielle Zeiten`}</span><span className="text-gold-300">{Math.round(progress)} %</span></div>
          <div role="progressbar" aria-label={`Fortschritt ${milestone.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/50"><div className={cn("h-full origin-left rounded-full transition-[width] duration-700", milestone.achieved && "saturate-150")} style={{ width: `${progress}%`, minWidth: progress > 0 ? "2px" : 0, background: "linear-gradient(90deg, #d88a19, #ffd66b)", boxShadow: "0 0 16px rgba(245,185,66,.65)" }} /></div>
          {milestone.achieved && next && <p className="mt-3 text-[10px] text-white/35">Nächstes Ziel: {next.threshold.toLocaleString("de-DE")}</p>}
          {milestone.achieved && milestone.playerName && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-gold-200"><Flag className="size-3" /> Ausgelöst von {milestone.playerName}</p>}
        </article>;
      })}
    </div>
  );
}
