import { Target, Timer, Trophy, Users } from "lucide-react";
import type { Statistic } from "@/types";
import { AnimatedCard } from "@/components/common/AnimatedCard";

const icons = { timer: Timer, users: Users, trophy: Trophy, target: Target };

export function StatCard({ statistic, delay = 0 }: { statistic: Statistic; delay?: number }) {
  const Icon = icons[statistic.icon];
  return (
    <AnimatedCard delay={delay} className="min-w-0 p-4 sm:p-6">
      <div className="flex items-start justify-between">
        <span className="context-accent-background grid size-9 place-items-center rounded-full sm:size-11"><Icon className="size-4 sm:size-5" /></span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">{statistic.change}</span>
      </div>
      <p className="context-gradient-text mt-6 break-words font-display text-3xl font-black sm:mt-8 sm:text-5xl">{statistic.value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/35">{statistic.label}</p>
    </AnimatedCard>
  );
}
