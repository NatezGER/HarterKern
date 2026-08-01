export type AvatarImageVariant = "list" | "roster" | "profile" | "podium" | "timeline" | "live";

const positions: Record<AvatarImageVariant, string> = {
  list: "object-[center_28%]",
  roster: "object-[center_24%]",
  profile: "object-[center_20%]",
  podium: "object-[center_24%]",
  timeline: "object-[center_28%]",
  live: "object-[center_24%]",
};

const desktopPortraitOverrides: Record<string, string> = {
  "11000000-0000-0000-0000-000000000001": "sm:scale-[1.2] sm:object-[center_17%]",
  "11000000-0000-0000-0000-000000000002": "sm:scale-[1.2] sm:object-[center_16%]",
  "11000000-0000-0000-0000-000000000003": "sm:scale-[1.16] sm:object-[center_16%]",
};

export function getAvatarImageClass(variant: AvatarImageVariant, playerId?: string) {
  return `block size-full min-h-0 min-w-0 max-h-full max-w-full rounded-full object-cover ${positions[variant]} ${playerId ? desktopPortraitOverrides[playerId] ?? "" : ""}`.trim();
}

export const getOriginalAvatarSource = (url: string) => url;
