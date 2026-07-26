import { Target, Timer, Trophy, Users } from "lucide-react";
import type { Statistic } from "@/types";
import { AnimatedCard } from "@/components/common/AnimatedCard";

const icons = { timer: Timer, users: Users, trophy: Trophy, target: Target };

export function StatCard({ statistic, delay = 0 }: { statistic: Statistic; delay?: number }) {
  const Icon = icons[statistic.icon];
  return (
    <AnimatedCard delay={delay} className="p-6">
      <div className="flex items-start justify-between">
        <span className="grid size-11 place-items-center rounded-full bg-gold-400/10 text-gold-400"><Icon className="size-5" /></span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">{statistic.change}</span>
      </div>
      <p className="gold-text mt-8 font-display text-5xl font-black">{statistic.value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/35">{statistic.label}</p>
    </AnimatedCard>
  );
}
