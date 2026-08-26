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
    <div id="trophy-cabinet" className={cn("grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3", className)}>
      {trophies.map((trophy, index) => {
        const isSeasonTrophy = trophy.competitionType === "season";
        const isHistoricalTrophy = trophy.competitionType === "historical";
        const content = (
          <>
            <div data-trophy-artwork className="flex h-60 w-full items-center justify-center sm:h-72 lg:h-80">
              <AwardAssetImage
                assetId={trophyAssetIdForAward(trophy) ?? ""}
                alt={isHistoricalTrophy ? trophy.competitionName : `${trophy.competitionName}, ${trophy.placement}. Platz`}
                className="max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.38)]"
                fallback={<span className={cn(
                  "grid aspect-[3/4] h-44 place-items-center rounded-3xl bg-gradient-to-br shadow-xl sm:h-52",
                  trophyStyles[trophy.tier],
                )}><Trophy className="size-20 drop-shadow-[0_4px_4px_rgba(0,0,0,.45)] sm:size-24" /></span>}
              />
            </div>
            <p className="mt-5 font-display text-3xl font-black uppercase sm:text-4xl">
              {isHistoricalTrophy ? trophy.competitionName : isSeasonTrophy && trophy.placement === 1 ? "Saisonmeister" : `${trophy.placement}. Platz`}
            </p>
            <p className="mt-2 text-sm font-semibold text-white/55">
              {isHistoricalTrophy ? "Historischer Meilenstein" : isSeasonTrophy ? `Saison ${trophy.year}` : trophy.competitionName}
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/30 sm:text-xs">
              {isHistoricalTrophy ? "Historische Trophäe" : isSeasonTrophy ? "Karriere-Trophäe" : "Event-Trophäe"} · {formatDate(trophy.eventDate)}
            </p>
          </>
        );
        const styles = cn(
          "panel relative block min-h-[26rem] overflow-hidden p-6 text-center transition hover:-translate-y-1 hover:border-gold-400/25 sm:min-h-[31rem] sm:p-8 lg:p-10",
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
