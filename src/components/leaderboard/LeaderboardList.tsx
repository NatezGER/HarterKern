import { Link } from "react-router-dom";
import type { ReturnTypeRankedPlayers } from "@/types/view";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/utils/format";
import { Avatar } from "@/components/common/Avatar";
import { RankIndicator } from "@/components/common/RankIndicator";

export function LeaderboardList({ entries }: { entries: ReturnTypeRankedPlayers }) {
  if (entries.length === 0) {
    return <div className="panel py-20 text-center text-sm text-white/40">Kein Spieler gefunden.</div>;
  }

  return (
    <div className="space-y-2">
      {entries.map(({ player, rank, recordDate }) => (
        <Link
          key={player.id}
          to={`/player/${player.id}`}
          className={cn(
            "group grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-2xl border px-4 py-4 transition duration-300 sm:grid-cols-[3rem_1fr_8rem_7rem_6rem] sm:px-6",
            rank <= 3
              ? "border-gold-400/20 bg-gradient-to-r from-gold-400/[0.08] to-transparent hover:border-gold-400/40"
              : rank <= 10
                ? "border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.06]"
                : "border-transparent bg-white/[0.018] hover:border-white/[0.08]",
          )}
        >
          <span className={cn("font-display text-2xl font-black", rank <= 3 ? "text-gold-400" : "text-white/25")}>
            {String(rank).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar player={player} size="md" />
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-black uppercase">{player.name}</p>
              <RankIndicator trend={player.trend} />
            </div>
          </div>
          <p className="hidden text-xs text-white/35 sm:block">{formatDate(recordDate)}</p>
          <div className="hidden text-right sm:block">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">Ø Zeit</p>
            <p className="mt-1 font-display text-lg font-bold text-white/60">{formatTime(player.average)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">Bestzeit</p>
            <p className="mt-1 font-display text-xl font-black text-white transition group-hover:text-gold-300">{formatTime(player.personalBest)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
