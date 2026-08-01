import { cn } from "@/lib/cn";
import type { Player } from "@/types";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import type { AvatarImageVariant } from "@/lib/avatarPresentation";

interface AvatarProps {
  player: Player;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: AvatarImageVariant;
}

const sizes = {
  sm: "size-9 text-xs",
  md: "size-12 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-2xl",
};

export function Avatar({ player, size = "md", className, variant = "list" }: AvatarProps) {
  return (
    <ProfileAvatar
      id={player.id}
      name={player.name}
      url={player.avatarUrl}
      variant={variant}
      className={cn(
        "ring-offset-4 ring-offset-[#111312]",
        sizes[size],
        className,
      )}
    />
  );
}
