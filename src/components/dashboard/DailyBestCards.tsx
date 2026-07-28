import { CalendarDays, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { getPlayerById } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { formatShortDate, formatTime } from "@/utils/format";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { Avatar } from "@/components/common/Avatar";
import { SectionHeading } from "@/components/common/SectionHeading";
import { getInitials } from "@/utils/avatar";

export function DailyBestCards() {
  const { data } = useEffectivePublicData();
  return (
    <section>
      <SectionHeading eyebrow="Letzte Sessions" title="Tagesbestzeiten" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.dailyWinners.length === 0 && <p className="panel col-span-full py-16 text-center text-sm text-white/35">Noch keine abgeschlossenen Events mit Sieger.</p>}
        {data.dailyWinners.map((winner, index) => {
          const player = getPlayerById(data.players, winner.playerId);
          return (
            <AnimatedCard key={winner.id} delay={index * 0.06} className="p-5">
              <div className="flex items-center justify-between">
                {player ? <Avatar player={player} size="md" /> : (
                  <span className="grid size-12 place-items-center rounded-full bg-gold-400 font-display font-black text-black">
                    {getInitials(winner.participantName)}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  <CalendarDays className="size-3.5" /> {formatShortDate(winner.date)}
                </span>
              </div>
              {player ? <Link
                to={`/player/${player.id}`}
                className="mt-6 block w-fit rounded-lg font-display text-xl font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                {player.name}
              </Link> : (
                <p className="mt-6 font-display text-xl font-black uppercase">
                  {winner.participantName} <span className="text-xs text-gold-300">Gast</span>
                </p>
              )}
              <p className="gold-text mt-1 font-display text-4xl font-black">{formatTime(winner.time)}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-white/35">
                <Target className="size-3.5" /> {winner.attempts} Versuche
              </p>
            </AnimatedCard>
          );
        })}
      </div>
    </section>
  );
}
