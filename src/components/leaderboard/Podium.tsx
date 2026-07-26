import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { getPodiumPlayers } from "@/data/selectors";
import { cn } from "@/lib/cn";
import { formatTime } from "@/utils/format";
import { Avatar } from "@/components/common/Avatar";

const podiumStyles = [
  { order: "order-2", height: "h-52 sm:h-60", color: "from-gold-300/30 to-gold-500/5", label: "Gold", avatar: "xl" as const },
  { order: "order-1", height: "h-36 sm:h-44", color: "from-slate-200/15 to-slate-500/5", label: "Silber", avatar: "lg" as const },
  { order: "order-3", height: "h-28 sm:h-36", color: "from-orange-500/15 to-orange-800/5", label: "Bronze", avatar: "lg" as const },
];

export function Podium() {
  const podium = getPodiumPlayers();
  const displayOrder = [podium[1], podium[0], podium[2]];

  return (
    <div className="grid min-h-[390px] grid-cols-3 items-end gap-2 pt-16 sm:gap-4">
      {displayOrder.map((entry, visualIndex) => {
        if (!entry) return null;
        const styleIndex = entry.rank - 1;
        const style = podiumStyles[styleIndex];
        return (
          <motion.div
            key={entry.player.id}
            initial={{ height: 0, opacity: 0 }}
            whileInView={{ height: "auto", opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + visualIndex * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className={cn("flex min-w-0 flex-col items-center", style.order)}
          >
            <div className="relative mb-5 text-center">
              {entry.rank === 1 && <Crown className="absolute -top-10 left-1/2 size-7 -translate-x-1/2 text-gold-400" />}
              <Avatar player={entry.player} size={style.avatar} className={entry.rank === 1 ? "ring-gold-400/60" : ""} />
              <p className="mt-4 truncate font-display text-xl font-black uppercase sm:text-2xl">{entry.player.name}</p>
              <p className="text-xs font-bold text-gold-300">{formatTime(entry.player.personalBest)}</p>
            </div>
            <div className={cn("relative w-full overflow-hidden rounded-t-2xl border border-b-0 border-white/10 bg-gradient-to-b", style.height, style.color)}>
              <span className="absolute inset-x-0 top-4 text-center font-display text-5xl font-black text-white/15 sm:text-7xl">{entry.rank}</span>
              <span className="absolute inset-x-0 bottom-4 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">{style.label}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
