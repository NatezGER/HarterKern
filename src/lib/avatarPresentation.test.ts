import { describe, expect, it } from "vitest";
import { getAvatarImageClass, getOriginalAvatarSource, type AvatarImageVariant } from "@/lib/avatarPresentation";

describe("avatar presentation", () => {
  it("keeps the original storage source without thumbnail transforms", () => {
    const source = "https://example.supabase.co/storage/v1/object/public/player-avatars/player/avatar.png?token=signed";
    expect(getOriginalAvatarSource(source)).toBe(source);
  });

  it("constrains every variant without pixelated image rendering", () => {
    const variants: AvatarImageVariant[] = ["list", "roster", "profile", "podium", "timeline", "live"];
    variants.forEach((variant) => {
      const classes = getAvatarImageClass(variant);
      expect(classes).toContain("max-h-full");
      expect(classes).toContain("max-w-full");
      expect(classes).toContain("object-cover");
      expect(classes).not.toContain("image-rendering");
      expect(classes).not.toContain("absolute");
    });
  });

  it("preserves the current mobile framing but restores the proven centered PR 7B desktop rendering", () => {
    expect(getAvatarImageClass("profile")).toContain("center_20%");
    expect(getAvatarImageClass("roster")).toContain("center_24%");
    expect(getAvatarImageClass("timeline")).toContain("center_28%");
    expect(getAvatarImageClass("profile")).toContain("sm:object-center");
  });

  it("never applies player-specific transforms or thumbnail sources", () => {
    const variants: AvatarImageVariant[] = ["list", "roster", "profile", "podium", "timeline", "live"];
    variants.forEach((variant) => {
      const classes = getAvatarImageClass(variant);
      expect(classes).not.toContain("scale-");
      expect(classes).not.toContain("transform");
      expect(classes).not.toContain("11000000");
    });
  });
});
