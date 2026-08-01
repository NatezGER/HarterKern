import { cn } from "@/lib/cn";
import type { LiveParticipant } from "@/types/liveEvent";

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
        "relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-display font-black text-black ring-2 ring-white/10",
        player.avatarGradient,
        className,
      )}
    >
      {player.avatarUrl
        ? <img src={player.avatarUrl} alt="" className="absolute inset-0 block size-full rounded-full object-cover object-center" />
        : player.initials}
    </div>
  );
}
