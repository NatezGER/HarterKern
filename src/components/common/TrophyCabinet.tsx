import { Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import type { TrophyAward } from "@/types/historyProfiles";
import { formatDate } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { AwardAssetImage } from "@/components/common/AwardAssetImage";
import { trophyAssetIdForAward } from "@/lib/awardAssets";

const trophyStyles = {
  gold: "from-yellow-100 via-yellow-400 to-amber-700 text-yellow-100",
  silver: "from-white via-slate-300 to-slate-600 text-slate-100",
  bronze: "from-orange-200 via-orange-500 to-amber-900 text-orange-200",
};

export function TrophyCabinet({
  trophies,
  mobileLimit = 2,
  className,
}: {
  trophies: TrophyAward[];
  mobileLimit?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!trophies.length) return null;
  return (
    <div>
    <div id="trophy-cabinet" className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4", className)}>
      {trophies.map((trophy, index) => {
        const isSeasonTrophy = trophy.competitionType === "season";
        const content = (
          <>
            <span className={cn(
              "mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br shadow-lg sm:size-20",
              trophyStyles[trophy.tier],
            )}>
              <AwardAssetImage
                assetId={trophyAssetIdForAward(trophy) ?? ""}
                alt={`${trophy.competitionName}, ${trophy.placement}. Platz`}
                className="p-1"
                fallback={<Trophy className="size-9 drop-shadow-[0_2px_2px_rgba(0,0,0,.45)] sm:size-11" />}
              />
            </span>
            <p className="mt-3 font-display text-lg font-black uppercase sm:text-xl">
              {isSeasonTrophy && trophy.placement === 1 ? "Saisonmeister" : `${trophy.placement}. Platz`}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-white/45">{isSeasonTrophy ? `Saison ${trophy.year}` : trophy.competitionName}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/25">
              {isSeasonTrophy ? "Karriere-Trophäe" : formatDate(trophy.eventDate)}
            </p>
          </>
        );
        const styles = cn(
          "panel block p-4 text-center transition hover:-translate-y-0.5 hover:border-gold-400/25 sm:p-5",
          index >= mobileLimit && !expanded && "max-sm:hidden",
        );
        return trophy.competitionType === "event" ? (
          <Link key={trophy.key} to={`/events/${trophy.competitionId}`} className={styles}>
            {content}
          </Link>
        ) : (
          <article key={trophy.key} className={styles}>{content}</article>
        );
      })}
    </div>
    {trophies.length > mobileLimit && <Button type="button" variant="outline" className="mt-4 w-full sm:hidden" aria-expanded={expanded} aria-controls="trophy-cabinet" onClick={() => setExpanded((value) => !value)}>{expanded ? "Trophäen einklappen" : "Alle Trophäen anzeigen"}</Button>}
    </div>
  );
}
