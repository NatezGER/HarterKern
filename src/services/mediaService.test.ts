import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeAdminMedia = vi.hoisted(() => vi.fn());
const validateAwardAssetFile = vi.hoisted(() => vi.fn());

vi.mock("@/services/adminMediaService", () => ({ invokeAdminMedia }));
vi.mock("@/lib/media", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/media")>(),
  validateAwardAssetFile,
}));

import {
  removeEventPhoto,
  removePlayerAvatar,
  uploadEventPhotos,
  uploadAwardAsset,
  uploadPlayerAvatar,
} from "@/services/mediaService";

const playerId = "10000000-0000-4000-8000-000000000001";
const eventId = "20000000-0000-4000-8000-000000000002";
const photoId = "30000000-0000-4000-8000-000000000003";

describe("code-admin media workflow", () => {
  beforeEach(() => {
    invokeAdminMedia.mockReset().mockResolvedValue({
      ok: true,
      publicUrl: "https://example.supabase.co/avatar.jpg",
    });
    validateAwardAssetFile.mockReset().mockResolvedValue(null);
  });

  it.each(["image/jpeg", "image/png", "image/webp"])(
    "uploads and replaces an avatar through the protected gateway for %s",
    async (type) => {
      const file = new File(["image"], "avatar", { type });
      await expect(uploadPlayerAvatar(playerId, file))
        .resolves.toBe("https://example.supabase.co/avatar.jpg");
      expect(invokeAdminMedia).toHaveBeenCalledWith(
        "upload-avatar",
        { playerId },
        file,
      );
    },
  );

  it("removes an avatar through the protected gateway", async () => {
    await removePlayerAvatar(playerId);
    expect(invokeAdminMedia).toHaveBeenCalledWith("remove-avatar", { playerId });
  });

  it("uploads valid event photos and reports individual failures", async () => {
    const first = new File(["one"], "one.jpg", { type: "image/jpeg" });
    const second = new File(["two"], "two.webp", { type: "image/webp" });
    invokeAdminMedia
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("Server lehnt Foto ab."));

    await expect(uploadEventPhotos(eventId, [first, second])).resolves.toEqual([
      { fileName: "one.jpg", ok: true },
      { fileName: "two.webp", ok: false, error: "Server lehnt Foto ab." },
    ]);
  });

  it("removes an event photo through the protected gateway", async () => {
    await removeEventPhoto(photoId);
    expect(invokeAdminMedia).toHaveBeenCalledWith("remove-event-photo", { photoId });
  });

  it("rejects unsupported files before any server mutation", async () => {
    const file = new File(["gif"], "avatar.gif", { type: "image/gif" });
    await expect(uploadPlayerAvatar(playerId, file)).rejects.toThrow("JPEG");
    expect(invokeAdminMedia).not.toHaveBeenCalled();
  });

  it("accepts a valid generated trophy ID before validating and uploading its file", async () => {
    const assetId = "trophy:season:2026:gold";
    const file = new File(["png"], "trophy.png", { type: "image/png" });

    await expect(uploadAwardAsset(assetId, file))
      .resolves.toBe("https://example.supabase.co/avatar.jpg");
    expect(validateAwardAssetFile).toHaveBeenCalledWith(file, "trophy");
    expect(invokeAdminMedia).toHaveBeenCalledWith(
      "upload-award-asset",
      { assetId },
      file,
    );
  });
});
