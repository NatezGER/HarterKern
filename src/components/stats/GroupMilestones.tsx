import { Check, Flag, LockKeyhole } from "lucide-react";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";

export function GroupMilestones() {
  const { data } = useEffectivePublicData();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {data.milestones.map((milestone) => {
        const progress = Math.min(100, (milestone.currentCount / milestone.threshold) * 100);
        return <article key={milestone.key} className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-full bg-gold-400/10 text-gold-300">{milestone.achieved ? <Check className="size-5" /> : <LockKeyhole className="size-4" />}</span><span className="text-xs font-bold text-white/35">{milestone.currentCount.toLocaleString("de-DE")} / {milestone.threshold.toLocaleString("de-DE")}</span></div>
          <h3 className="mt-5 font-display text-2xl font-black uppercase">{milestone.name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-white/40">{milestone.description}</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-beer-600 to-gold-300" style={{ width: `${progress}%` }} /></div>
          {milestone.achieved && milestone.playerName && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-gold-200"><Flag className="size-3" /> Ausgelöst von {milestone.playerName}</p>}
        </article>;
      })}
    </div>
  );
}
