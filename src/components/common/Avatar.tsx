import { cn } from "@/lib/cn";
import type { Player } from "@/types";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";

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
    <ProfileAvatar
      id={player.id}
      name={player.name}
      url={player.avatarUrl}
      className={cn(
        "ring-offset-4 ring-offset-[#111312]",
        sizes[size],
        className,
      )}
    />
  );
}
