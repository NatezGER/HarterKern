import { Crown, Flame, Medal, Zap } from "lucide-react";
import { badges } from "@/data/mockData";
import { cn } from "@/lib/cn";
import type { Player } from "@/types";

const icons = { crown: Crown, flame: Flame, zap: Zap, medal: Medal };
const tones = {
  gold: "border-gold-400/30 bg-gold-400/10 text-gold-300",
  silver: "border-slate-300/20 bg-slate-300/[0.07] text-slate-200",
  bronze: "border-orange-400/20 bg-orange-400/[0.07] text-orange-300",
  beer: "border-beer/25 bg-beer/[0.08] text-beer",
};

export function BadgeCollection({ player }: { player: Player }) {
  const playerBadges = badges.filter((badge) => player.badgeIds.includes(badge.id));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {playerBadges.map((badge) => {
        const Icon = icons[badge.icon];
        return (
          <div key={badge.id} className={cn("flex items-center gap-4 rounded-2xl border p-4", tones[badge.tone])}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black/20"><Icon className="size-5" /></span>
            <div>
              <p className="font-display text-lg font-black uppercase text-white">{badge.name}</p>
              <p className="text-xs opacity-60">{badge.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
