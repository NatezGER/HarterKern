import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_BYTES,
  createStoragePath,
  formatDrinkVolume,
  validateImageFile,
} from "@/lib/media";

describe("media rules", () => {
  it("accepts only supported image types within the purpose limit", () => {
    expect(validateImageFile({ type: "image/webp", size: 1024 }, "avatar")).toBeNull();
    expect(validateImageFile({ type: "image/gif", size: 1024 }, "avatar")).toContain("JPEG");
    expect(validateImageFile({
      type: "image/jpeg",
      size: AVATAR_MAX_BYTES + 1,
    }, "avatar")).toContain("5 MB");
  });

  it("creates an entity-scoped path without using the original file name", () => {
    const entity = "10000000-0000-0000-0000-000000000001";
    const object = "20000000-0000-0000-0000-000000000002";
    expect(createStoragePath(entity, "image/png", object))
      .toBe(`${entity}/${object}.png`);
  });

  it("counts drink volume only from supplied valid attempts", () => {
    expect(formatDrinkVolume(3, 330)).toBe("0,99 l");
    expect(formatDrinkVolume(0, 330)).toBe("0,00 l");
  });
});
