import { ArrowUpRight, Target, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import type { Player } from "@/types";
import { formatTime } from "@/utils/format";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { Avatar } from "@/components/common/Avatar";
import { MOBILE_CONTEXT_AVATAR_FRAME } from "@/constants/avatar";

export function PlayerCard({ player, delay = 0 }: { player: Player; delay?: number }) {
  return (
    <AnimatedCard delay={delay} className="group relative overflow-hidden p-3 sm:p-6">
      <div className={`absolute -right-12 -top-16 size-40 rounded-full bg-gradient-to-br ${player.avatarGradient} opacity-[0.08] blur-3xl transition group-hover:opacity-[0.14]`} />
      <Link to={`/player/${player.id}`} className="relative flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 sm:hidden">
        <Avatar player={player} size="lg" className={`${MOBILE_CONTEXT_AVATAR_FRAME} ring-offset-2`} />
        <h2 className="w-full truncate font-display text-xl font-black uppercase">{player.name}</h2>
      </Link>
      <div className="relative hidden sm:block">
        <div className="flex items-start justify-between">
          <Avatar player={player} size="lg" />
          <Link to={`/player/${player.id}`} className="grid size-10 place-items-center rounded-full border border-white/10 text-white/35 transition hover:border-gold-400/40 hover:text-gold-300">
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <h2 className="display-title mt-7 text-3xl">{player.name}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/25 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Personal Best</p>
            <p className="gold-text mt-2 font-display text-2xl font-black">{formatTime(player.personalBest)}</p>
          </div>
          <div className="rounded-2xl bg-black/25 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Durchschnitt</p>
            <p className="mt-2 font-display text-2xl font-black text-white/70">{formatTime(player.average)}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-5 text-xs text-white/35">
          <span className="flex items-center gap-1.5"><Target className="size-3.5 text-gold-400" /> {player.attempts} Versuche</span>
          <span className="flex items-center gap-1.5"><Trophy className="size-3.5 text-gold-400" /> {player.dailyWins} Siege</span>
        </div>
      </div>
    </AnimatedCard>
  );
}
