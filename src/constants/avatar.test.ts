import { describe, expect, it } from "vitest";
import { MOBILE_CONTEXT_AVATAR_FRAME } from "@/constants/avatar";

describe("mobile avatar context framing", () => {
  it("keeps every rule mobile-only and preserves proportional portrait height", () => {
    const classes = MOBILE_CONTEXT_AVATAR_FRAME.split(" ");

    expect(classes).toEqual([
      "max-sm:p-0.5",
      "max-sm:[&>img]:h-auto",
      "max-sm:[&>img]:w-full",
    ]);
    expect(classes.every((className) => className.startsWith("max-sm:"))).toBe(true);
  });

  it("contains no player-specific or image-positioning rule", () => {
    expect(MOBILE_CONTEXT_AVATAR_FRAME).not.toMatch(/player|paul|lars|fipsi|fred|leif|lonzo/i);
    expect(MOBILE_CONTEXT_AVATAR_FRAME).not.toMatch(/object-|translate|scale|transform|aspect-/);
  });
});
