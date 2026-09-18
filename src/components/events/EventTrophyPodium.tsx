import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { AwardAssetImage } from "@/components/common/AwardAssetImage";
import { cn } from "@/lib/cn";
import { trophyAssetIdForAward } from "@/lib/awardAssets";
import type { EventParticipantDetail, TrophyAward } from "@/types/historyProfiles";
import { formatTime } from "@/utils/format";

const placementOrder = [2, 1, 3] as const;

const placementStyles = {
  1: "order-2 min-h-[14rem] border-gold-400/30 bg-gold-400/[0.06] sm:min-h-[25rem]",
  2: "order-1 min-h-[13rem] border-slate-200/15 sm:min-h-[21rem]",
  3: "order-3 min-h-[12rem] border-amber-700/20 sm:min-h-[19rem]",
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
      className="grid min-w-0 grid-cols-3 items-end gap-1.5 sm:gap-4"
    >
      {orderedTrophies.map((trophy) => {
        const standing = matchingStanding(trophy, standings);
        const content = <>
          <div className={cn(
            "mx-auto flex h-20 items-center justify-center sm:h-52",
            trophy.placement === 1 && "h-24 sm:h-64",
          )}>
            <AwardAssetImage
              assetId={trophyAssetIdForAward(trophy) ?? ""}
              alt={`${trophy.playerName}, ${trophy.placement}. Platz`}
              className="max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.42)]"
              fallback={<span className={cn(
                "grid aspect-[3/4] h-16 place-items-center rounded-xl bg-gradient-to-br shadow-xl sm:h-40 sm:rounded-2xl",
                trophy.placement === 1 && "h-20 sm:h-48",
                fallbackStyles[trophy.tier],
              )}><Trophy className="size-8 drop-shadow-[0_4px_4px_rgba(0,0,0,.45)] sm:size-16" /></span>}
            />
          </div>
          <p className="mt-2 text-[8px] font-black uppercase tracking-[0.12em] text-white/40 sm:mt-3 sm:text-[10px] sm:tracking-[0.2em]">
            {trophy.placement}. Platz
          </p>
          <p className={cn(
            "mt-1 break-words font-display text-sm font-black uppercase leading-tight sm:text-2xl",
            trophy.placement === 1 && "gold-text text-base sm:text-4xl",
          )}>{trophy.playerName}</p>
          <p className="mt-2 font-display text-base font-black text-white/80 sm:text-3xl">
            {standing?.bestHundredths == null
              ? "—"
              : formatTime(standing.bestHundredths / 100)}
          </p>
        </>;
        const className = cn(
          "panel block min-w-0 overflow-hidden p-2 text-center transition hover:-translate-y-1 sm:p-6",
          placementStyles[trophy.placement],
        );
        return trophy.playerId
          ? <Link key={trophy.key} to={`/player/${trophy.playerId}`} data-placement={trophy.placement} className={className}>{content}</Link>
          : <article key={trophy.key} data-placement={trophy.placement} className={className}>{content}</article>;
      })}
    </div>
  );
}
