import { beforeEach, describe, expect, it, vi } from "vitest";
import { TROPHY_ASSET_IDS } from "./trophySlots.ts";
import { requireAwardUploadRequest } from "./validation.ts";

const invoke = vi.hoisted(() => vi.fn());
const validateAwardAssetFile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ functions: { invoke } }),
}));
vi.mock("@/lib/media", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/media")>(),
  validateAwardAssetFile,
}));

import { uploadAwardAsset } from "@/services/mediaService";

const storage = new Map<string, string>();
vi.stubGlobal("sessionStorage", {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
});

describe("award upload request boundary", () => {
  beforeEach(() => {
    storage.clear();
    storage.set("harter-kern-management-token", "signed-admin-token");
    validateAwardAssetFile.mockReset().mockResolvedValue(null);
    invoke.mockReset().mockResolvedValue({
      data: { ok: true, publicUrl: "https://example.test/trophy.png" },
      error: null,
    });
  });

  it.each(TROPHY_ASSET_IDS)(
    "serializes and accepts the canonical trophy ID %s",
    async (assetId) => {
      const file = new File(["png"], "trophy.png", { type: "image/png" });

      await expect(uploadAwardAsset(assetId, file))
        .resolves.toBe("https://example.test/trophy.png");

      const body = invoke.mock.calls[0][1].body as FormData;
      expect(body.get("action")).toBe("upload-award-asset");
      expect(body.get("assetId")).toBe(assetId);
      expect(body.get("file")).toBe(file);
      expect(requireAwardUploadRequest(body)).toEqual({
        action: "upload-award-asset",
        assetId,
      });
    },
  );

  it("rejects a malformed trophy ID at the same server request boundary", () => {
    const body = new FormData();
    body.set("action", "upload-award-asset");
    body.set("assetId", "trophy:season:2027:gold");

    expect(() => requireAwardUploadRequest(body)).toThrow("Award-Auswahl ist ungültig.");
  });
});
