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
    <div id="trophy-cabinet" className={cn("grid min-w-0 grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
      {trophies.map((trophy, index) => {
        const isSeasonTrophy = trophy.competitionType === "season";
        const isHistoricalTrophy = trophy.competitionType === "historical";
        const content = (
          <>
            <div data-trophy-artwork className="flex h-32 w-full items-center justify-center min-[375px]:h-36 sm:h-64 lg:h-72">
              <AwardAssetImage
                assetId={trophyAssetIdForAward(trophy) ?? ""}
                alt={isHistoricalTrophy ? trophy.competitionName : `${trophy.competitionName}, ${trophy.placement}. Platz`}
                className="max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.38)]"
                fallback={<span className={cn(
                  "grid aspect-[3/4] h-24 place-items-center rounded-2xl bg-gradient-to-br shadow-xl min-[375px]:h-28 sm:h-44 sm:rounded-3xl",
                  trophyStyles[trophy.tier],
                )}><Trophy className="size-10 drop-shadow-[0_4px_4px_rgba(0,0,0,.45)] min-[375px]:size-12 sm:size-20" /></span>}
              />
            </div>
            <p className="mt-2 break-words font-display text-xl font-black uppercase min-[375px]:text-2xl sm:mt-4 sm:text-3xl">
              {isHistoricalTrophy ? trophy.competitionName : isSeasonTrophy && trophy.placement === 1 ? "Saisonmeister" : `${trophy.placement}. Platz`}
            </p>
            {!isHistoricalTrophy && <>
              <p className="mt-1 break-words text-xs font-semibold leading-5 text-white/55 sm:mt-2 sm:text-sm">
                {isSeasonTrophy ? `Saison ${trophy.year}` : trophy.competitionName}
              </p>
              <p className="mt-2 break-words text-[8px] uppercase tracking-[0.12em] text-white/30 sm:mt-3 sm:text-xs sm:tracking-[0.18em]">
                {isSeasonTrophy ? "Karriere-Trophäe" : "Event-Trophäe"} · {formatDate(trophy.eventDate)}
              </p>
            </>}
          </>
        );
        const styles = cn(
          "panel relative block min-h-[16rem] min-w-0 overflow-hidden p-2.5 text-center transition hover:-translate-y-1 hover:border-gold-400/25 min-[375px]:min-h-[18rem] min-[375px]:p-3 sm:min-h-[27rem] sm:p-6 lg:p-8",
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
