import { cn } from "@/lib/cn";
import type { LiveParticipant } from "@/types/liveEvent";
import { getAvatarImageClass, getOriginalAvatarSource } from "@/lib/avatarPresentation";

export function LiveAvatar({
  player,
  className,
}: {
  player: LiveParticipant;
  className?: string;
}) {
  return (
    <div
      aria-label={`Profilbild von ${player.name}`}
      className={cn(
        "grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-display font-black text-black ring-2 ring-white/10",
        player.avatarGradient,
        className,
      )}
    >
      {player.avatarUrl
        ? <img src={getOriginalAvatarSource(player.avatarUrl)} alt="" className={getAvatarImageClass("live")} />
        : player.initials}
    </div>
  );
}
