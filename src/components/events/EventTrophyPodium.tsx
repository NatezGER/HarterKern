import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { AwardAssetImage } from "@/components/common/AwardAssetImage";
import { cn } from "@/lib/cn";
import { trophyAssetIdForAward } from "@/lib/awardAssets";
import type { EventParticipantDetail, TrophyAward } from "@/types/historyProfiles";
import { formatTime } from "@/utils/format";

const placementOrder = [2, 1, 3] as const;

const placementStyles = {
  1: "order-1 border-gold-400/30 bg-gold-400/[0.06] sm:order-2 sm:min-h-[25rem]",
  2: "order-2 border-slate-200/15 sm:order-1 sm:min-h-[21rem]",
  3: "order-3 border-amber-700/20 sm:min-h-[19rem]",
};

const fallbackStyles = {
  gold: "from-yellow-100 via-yellow-400 to-amber-700 text-yellow-100",
  silver: "from-white via-slate-300 to-slate-600 text-slate-100",
  bronze: "from-orange-200 via-orange-500 to-amber-900 text-orange-200",
};

function matchingStanding(
  trophy: TrophyAward,
  standings: EventParticipantDetail[],
) {
  return standings.find((standing) => trophy.playerId
    ? standing.playerId === trophy.playerId
    : standing.guestId === trophy.guestId);
}

export function EventTrophyPodium({
  trophies,
  standings,
}: {
  trophies: TrophyAward[];
  standings: EventParticipantDetail[];
}) {
  const orderedTrophies = [...trophies].sort((left, right) =>
    placementOrder.indexOf(left.placement) - placementOrder.indexOf(right.placement));

  return (
    <div
      data-event-trophy-podium
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 sm:gap-4"
    >
      {orderedTrophies.map((trophy) => {
        const standing = matchingStanding(trophy, standings);
        const content = <>
          <div className={cn(
            "mx-auto flex h-36 items-center justify-center sm:h-52",
            trophy.placement === 1 && "h-44 sm:h-64",
          )}>
            <AwardAssetImage
              assetId={trophyAssetIdForAward(trophy) ?? ""}
              alt={`${trophy.playerName}, ${trophy.placement}. Platz`}
              className="max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.42)]"
              fallback={<span className={cn(
                "grid aspect-[3/4] h-28 place-items-center rounded-2xl bg-gradient-to-br shadow-xl sm:h-40",
                trophy.placement === 1 && "h-36 sm:h-48",
                fallbackStyles[trophy.tier],
              )}><Trophy className="size-12 drop-shadow-[0_4px_4px_rgba(0,0,0,.45)] sm:size-16" /></span>}
            />
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            {trophy.placement}. Platz
          </p>
          <p className={cn(
            "mt-1 truncate font-display text-2xl font-black uppercase",
            trophy.placement === 1 && "gold-text text-3xl sm:text-4xl",
          )}>{trophy.playerName}</p>
          <p className="mt-2 font-display text-2xl font-black text-white/80 sm:text-3xl">
            {standing?.bestHundredths == null
              ? "—"
              : formatTime(standing.bestHundredths / 100)}
          </p>
        </>;
        const className = cn(
          "panel block min-h-[17rem] overflow-hidden p-4 text-center transition hover:-translate-y-1 sm:p-6",
          placementStyles[trophy.placement],
        );
        return trophy.playerId
          ? <Link key={trophy.key} to={`/player/${trophy.playerId}`} className={className}>{content}</Link>
          : <article key={trophy.key} className={className}>{content}</article>;
      })}
    </div>
  );
}
