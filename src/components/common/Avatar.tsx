import { cn } from "@/lib/cn";
import type { Player } from "@/types";

interface AvatarProps {
  player: Player;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "size-9 text-xs",
  md: "size-12 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-2xl",
};

export function Avatar({ player, size = "md", className }: AvatarProps) {
  return (
    <div
      aria-label={`Profilbild von ${player.name}`}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-display font-black text-black ring-2 ring-white/10 ring-offset-4 ring-offset-[#111312]",
        player.avatarGradient,
        sizes[size],
        className,
      )}
    >
      {player.initials}
    </div>
  );
}
