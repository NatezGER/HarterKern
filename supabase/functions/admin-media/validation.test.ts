import { describe, expect, it } from "vitest";
import {
  readAwardImageDimensions,
  requireAwardAssetId,
  requirePostgresUuid,
  validateAwardImageMetadata,
} from "./validation.ts";

describe("PostgreSQL UUID validation for admin media", () => {
  it("accepts existing seed player IDs without RFC version bits", () => {
    expect(requirePostgresUuid("11000000-0000-0000-0000-000000000001", "Spieler"))
      .toBe("11000000-0000-0000-0000-000000000001");
  });

  it("accepts existing seed event IDs without RFC variant bits", () => {
    expect(requirePostgresUuid("22000000-0000-0000-0000-000000000001", "Event"))
      .toBe("22000000-0000-0000-0000-000000000001");
  });

  it("accepts standard random UUIDs", () => {
    expect(requirePostgresUuid("c8ace655-ae1d-4c37-8d55-934c30ef4b4c", "Foto"))
      .toBe("c8ace655-ae1d-4c37-8d55-934c30ef4b4c");
  });

  it.each([
    "",
    "11000000-0000-0000-0000-000000000001' OR true --",
    "11000000-0000-0000-0000-00000000001",
    "11000000-0000-0000-0000-000000000001/extra",
  ])("rejects malformed or injected values: %s", (id) => {
    expect(() => requirePostgresUuid(id, "Spieler")).toThrow("Spieler ist ungültig.");
  });
});

function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71], 0);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe("admin award validation", () => {
  it("accepts stable existing asset ID shapes", () => {
    expect(requireAwardAssetId("medal:podium:gold")).toBe("medal:podium:gold");
    expect(requireAwardAssetId("badge:first-sub3")).toBe("badge:first-sub3");
    expect(requireAwardAssetId("trophy:season:season-2026:2026:gold"))
      .toBe("trophy:season:season-2026:2026:gold");
  });

  it("rejects unknown asset identities", () => {
    expect(() => requireAwardAssetId("medal:podium:diamond")).toThrow(/ungültig/);
  });

  it("reads PNG dimensions for server-side validation", () => {
    expect(readAwardImageDimensions(pngHeader(1024, 1024), "image/png"))
      .toEqual({ width: 1024, height: 1024 });
  });

  it("enforces server-side type, size and dimensions", () => {
    expect(validateAwardImageMetadata({ mimeType: "image/jpeg", size: 1000 })).toMatch(/PNG- oder WebP/);
    expect(validateAwardImageMetadata({ mimeType: "image/png", size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
    expect(validateAwardImageMetadata({ mimeType: "image/webp", size: 1000, width: 900, height: 800 })).toMatch(/quadratisch/);
    expect(validateAwardImageMetadata({ mimeType: "image/webp", size: 1000, width: 500, height: 500 })).toMatch(/512/);
    expect(validateAwardImageMetadata({ mimeType: "image/webp", size: 1000, width: 1024, height: 1024 })).toBeNull();
  });
});
