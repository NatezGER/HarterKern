export type AvatarImageVariant = "list" | "roster" | "profile" | "podium" | "timeline" | "live";

const positions: Record<AvatarImageVariant, string> = {
  list: "object-[center_28%]",
  roster: "object-[center_24%]",
  profile: "object-[center_20%]",
  podium: "object-[center_24%]",
  timeline: "object-[center_28%]",
  live: "object-[center_24%]",
};

export function getAvatarImageClass(variant: AvatarImageVariant) {
  return `block size-full min-h-0 min-w-0 max-h-full max-w-full rounded-full object-cover ${positions[variant]} sm:object-center`;
}

export const getOriginalAvatarSource = (url: string) => url;
