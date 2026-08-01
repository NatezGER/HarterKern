import { cn } from "@/lib/cn";
import { getAvatarImageClass, getOriginalAvatarSource, type AvatarImageVariant } from "@/lib/avatarPresentation";
import { getAvatarGradient, getInitials } from "@/utils/avatar";

export function ProfileAvatar({
  id,
  name,
  url,
  className,
  variant = "list",
}: {
  id: string;
  name: string;
  url: string | null;
  className?: string;
  variant?: AvatarImageVariant;
}) {
  return (
    <span
      aria-label={`Profilbild von ${name}`}
      className={cn(
        "grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-display font-black text-black ring-2 ring-white/10",
        getAvatarGradient(id),
        className,
      )}
    >
      {url
        ? <img
            src={getOriginalAvatarSource(url)}
            alt=""
            loading="lazy"
            className={getAvatarImageClass(variant, id)}
          />
        : getInitials(name)}
    </span>
  );
}
