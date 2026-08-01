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

  it("uses dedicated portrait positions for large, roster and timeline avatars", () => {
    expect(getAvatarImageClass("profile")).toContain("center_20%");
    expect(getAvatarImageClass("roster")).toContain("center_24%");
    expect(getAvatarImageClass("timeline")).toContain("center_28%");
  });

  it("keeps mobile framing and only tightens known full-body portraits on desktop", () => {
    const fipsi = getAvatarImageClass("roster", "11000000-0000-0000-0000-000000000001");
    const paul = getAvatarImageClass("podium", "11000000-0000-0000-0000-000000000002");
    const lars = getAvatarImageClass("profile", "11000000-0000-0000-0000-000000000003");

    expect(fipsi).toContain("object-[center_24%]");
    expect(fipsi).toContain("sm:scale-[1.2]");
    expect(paul).toContain("object-[center_24%]");
    expect(paul).toContain("sm:object-[center_16%]");
    expect(lars).toContain("object-[center_20%]");
    expect(lars).toContain("sm:scale-[1.16]");
  });

  it("does not alter players whose portrait framing is already suitable", () => {
    const leif = getAvatarImageClass("podium", "11000000-0000-0000-0000-000000000007");
    const lonzo = getAvatarImageClass("roster", "11000000-0000-0000-0000-000000000008");

    expect(leif).toBe(getAvatarImageClass("podium"));
    expect(lonzo).toBe(getAvatarImageClass("roster"));
    expect(leif).not.toContain("sm:scale");
    expect(lonzo).not.toContain("sm:scale");
  });
});
