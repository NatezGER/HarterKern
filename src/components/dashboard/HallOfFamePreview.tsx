import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getRankedPlayers } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { formatTime } from "@/utils/format";
import { Avatar } from "@/components/common/Avatar";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { HallOfFameRankEmblem } from "@/components/common/HallOfFameRankEmblem";
import { useSeason } from "@/hooks/useSeason";

export function HallOfFamePreview() {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const entries = getRankedPlayers(data.players, data.leaderboard).slice(0, 10);

  return (
    <section>
      <SectionHeading
        eyebrow={isAllTime ? "Ewige Rangliste" : `Saisonrangliste ${season}`}
        title="Hall of Fame"
        action={<Button asChild variant="ghost" size="sm"><Link to="/leaderboard">Alle anzeigen <ArrowRight className="size-4" /></Link></Button>}
      />
      <div className="panel overflow-hidden">
        {entries.length === 0 && <p className="py-16 text-center text-sm text-white/35">{isAllTime ? "Noch keine bestätigten Bestzeiten." : `Noch keine qualifizierten Zeiten in Saison ${season}.`}</p>}
        {entries.map(({ player, rank }) => (
          <Link
            key={player.id}
            to={`/player/${player.id}`}
            className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 transition last:border-0 hover:bg-white/[0.035] sm:grid-cols-[2.5rem_1fr_6rem] sm:px-6"
          >
            {rank <= 3
              ? <HallOfFameRankEmblem place={rank as 1 | 2 | 3} size="compact" />
              : <span className="font-display text-lg font-bold text-white/25">{String(rank).padStart(2, "0")}</span>}
            <div className="flex min-w-0 items-center gap-3">
              <Avatar player={player} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{player.name}</p>
              </div>
            </div>
            <p className="font-display text-lg font-black text-white transition group-hover:text-gold-300">{formatTime(player.personalBest)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
