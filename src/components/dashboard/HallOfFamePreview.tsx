import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getRankedPlayers } from "@/data/selectors";
import { usePublicData } from "@/hooks/usePublicData";
import { formatTime } from "@/utils/format";
import { Avatar } from "@/components/common/Avatar";
import { RankIndicator } from "@/components/common/RankIndicator";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";

export function HallOfFamePreview() {
  const { data } = usePublicData();
  const entries = getRankedPlayers(data.players, data.leaderboard).slice(0, 10);

  return (
    <section>
      <SectionHeading
        eyebrow="Ewige Rangliste"
        title="Hall of Fame"
        action={<Button asChild variant="ghost" size="sm"><Link to="/leaderboard">Alle anzeigen <ArrowRight className="size-4" /></Link></Button>}
      />
      <div className="panel overflow-hidden">
        {entries.length === 0 && <p className="py-16 text-center text-sm text-white/35">Noch keine bestätigten Bestzeiten.</p>}
        {entries.map(({ player, rank }) => (
          <Link
            key={player.id}
            to={`/player/${player.id}`}
            className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 transition last:border-0 hover:bg-white/[0.035] sm:grid-cols-[2.5rem_1fr_7rem_5rem] sm:px-6"
          >
            <span className={rank <= 3 ? "font-display text-xl font-black text-gold-400" : "font-display text-lg font-bold text-white/25"}>{String(rank).padStart(2, "0")}</span>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar player={player} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{player.name}</p>
                <RankIndicator trend={player.trend} />
              </div>
            </div>
            <p className="hidden text-right text-xs text-white/30 sm:block">{player.attempts} Versuche</p>
            <p className="font-display text-lg font-black text-white transition group-hover:text-gold-300">{formatTime(player.personalBest)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
