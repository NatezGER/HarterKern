import { Clock3 } from "lucide-react";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { formatTime } from "@/utils/format";
import type { LiveStanding } from "@/types/liveEvent";

export function LiveLeaderboard({ standings }: { standings: LiveStanding[] }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-white/[0.07] px-5 py-4 sm:px-7">
        <h2 className="display-title text-2xl">Live-Rangliste</h2>
      </div>
      <div>
        {standings.map((standing) => (
          <div
            key={standing.player.id}
            className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 border-b border-white/[0.06] px-4 py-4 last:border-0 sm:grid-cols-[3rem_1fr_8rem_8rem] sm:px-7"
          >
            <span className="font-display text-2xl font-black text-gold-400">
              {standing.rank ? String(standing.rank).padStart(2, "0") : "—"}
            </span>
            <div className="flex min-w-0 items-center gap-3">
              <LiveAvatar player={standing.player} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-bold">{standing.player.name}</p>
                {standing.player.isAk && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                    Außer Konkurrenz
                  </span>
                )}
              </div>
            </div>
            <p className="hidden text-right text-sm text-white/40 sm:block">
              PB {formatTime(standing.player.personalBest)}
            </p>
            <div className="text-right">
              <p className="font-display text-xl font-black">
                {formatTime(standing.bestTime ?? 0)}
              </p>
              {standing.pendingBest != null && standing.pendingBest === standing.bestTime && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                  <Clock3 className="size-3" /> wartet auf Freigabe
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
