import { describe, expect, it } from "vitest";
import { validateAwardAssetMetadata } from "@/lib/media";

describe("award asset upload validation", () => {
  it("accepts square PNG and WebP images from 512 px", () => {
    expect(validateAwardAssetMetadata({ type: "image/png", size: 1024 }, { width: 512, height: 512 })).toBeNull();
    expect(validateAwardAssetMetadata({ type: "image/webp", size: 1024 }, { width: 2048, height: 2048 })).toBeNull();
  });

  it("rejects JPEG and files over 2 MB", () => {
    expect(validateAwardAssetMetadata({ type: "image/jpeg", size: 1024 })).toMatch(/PNG- oder WebP/);
    expect(validateAwardAssetMetadata({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
  });

  it("rejects non-square and undersized images", () => {
    expect(validateAwardAssetMetadata({ type: "image/png", size: 1024 }, { width: 1024, height: 900 })).toMatch(/quadratisch/);
    expect(validateAwardAssetMetadata({ type: "image/png", size: 1024 }, { width: 511, height: 511 })).toMatch(/512/);
  });

  it("accepts portrait trophies while badges and medals remain square", () => {
    const portrait = { width: 768, height: 1024 };
    expect(validateAwardAssetMetadata(
      { type: "image/webp", size: 1024 }, portrait, "trophy",
    )).toBeNull();
    expect(validateAwardAssetMetadata(
      { type: "image/webp", size: 1024 }, portrait, "badge",
    )).toMatch(/quadratisch/);
    expect(validateAwardAssetMetadata(
      { type: "image/webp", size: 1024 }, portrait, "medal",
    )).toMatch(/quadratisch/);
  });
});
