import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    auth: { getSession: mocks.getSession },
    rpc: mocks.rpc,
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: mocks.getPublicUrl,
      }),
    },
  }),
}));

import {
  removePlayerAvatar,
  uploadPlayerAvatar,
} from "@/services/mediaService";

const playerId = "10000000-0000-0000-0000-000000000001";
const oldPath =
  `${playerId}/20000000-0000-0000-0000-000000000002.jpg`;

describe("avatar media workflow", () => {
  beforeEach(() => {
    mocks.getSession.mockReset().mockResolvedValue({
      data: { session: { user: { id: "admin" } } },
      error: null,
    });
    mocks.rpc.mockReset().mockImplementation((name: string) => {
      if (name === "is_admin") return Promise.resolve({ data: true, error: null });
      if (name === "admin_set_player_avatar") {
        return Promise.resolve({ data: oldPath, error: null });
      }
      if (name === "admin_clear_player_avatar") {
        return Promise.resolve({ data: oldPath, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    mocks.upload.mockReset().mockResolvedValue({ data: {}, error: null });
    mocks.remove.mockReset().mockResolvedValue({ data: {}, error: null });
    mocks.getPublicUrl.mockReset().mockReturnValue({
      data: { publicUrl: "https://example.supabase.co/avatar.jpg" },
    });
  });

  it("uploads, links and returns the public URL before removing the old avatar", async () => {
    const file = new File(["image"], "ignored-name.jpg", { type: "image/jpeg" });
    await expect(uploadPlayerAvatar(playerId, file))
      .resolves.toBe("https://example.supabase.co/avatar.jpg");
    const uploadedPath = mocks.upload.mock.calls[0][0] as string;
    expect(uploadedPath).toMatch(new RegExp(`^${playerId}/[0-9a-f-]{36}\\.jpg$`));
    expect(mocks.rpc).toHaveBeenCalledWith("admin_set_player_avatar", {
      p_player_id: playerId,
      p_storage_path: uploadedPath,
    });
    expect(mocks.remove).toHaveBeenCalledWith([oldPath]);
    expect(mocks.getPublicUrl).toHaveBeenCalledWith(uploadedPath);
  });

  it("removes the database reference and its exact storage object", async () => {
    await removePlayerAvatar(playerId);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_clear_player_avatar", {
      p_player_id: playerId,
    });
    expect(mocks.remove).toHaveBeenCalledWith([oldPath]);
  });

  it("cleans up a new object when linking it fails", async () => {
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "is_admin") return Promise.resolve({ data: true, error: null });
      return Promise.resolve({ data: null, error: new Error("RPC failed") });
    });
    const file = new File(["image"], "avatar.jpg", { type: "image/jpeg" });
    await expect(uploadPlayerAvatar(playerId, file)).rejects.toThrow("RPC failed");
    const uploadedPath = mocks.upload.mock.calls[0][0] as string;
    expect(mocks.remove).toHaveBeenCalledWith([uploadedPath]);
    expect(mocks.remove).not.toHaveBeenCalledWith([oldPath]);
  });

  it("never writes storage without an authenticated admin session", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const file = new File(["image"], "avatar.jpg", { type: "image/jpeg" });
    await expect(uploadPlayerAvatar(playerId, file))
      .rejects.toThrow("geschützte Supabase-Adminsession");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
