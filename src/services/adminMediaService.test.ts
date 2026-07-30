import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ functions: { invoke } }),
}));

import {
  clearManagementCode,
  invokeAdminMedia,
  verifyManagementCode,
} from "@/services/adminMediaService";

const storage = new Map<string, string>();
vi.stubGlobal("sessionStorage", {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
});

describe("code-admin authorization", () => {
  beforeEach(() => {
    sessionStorage.clear();
    invoke.mockReset().mockResolvedValue({
      data: { ok: true, token: "signed-admin-token" },
      error: null,
    });
  });

  it("verifies the code on the server before enabling media operations", async () => {
    await expect(verifyManagementCode(" 5221 ")).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith("admin-media", {
      body: expect.any(FormData),
    });
    const authorizationBody = invoke.mock.calls[0][1].body as FormData;
    expect(authorizationBody.get("action")).toBe("authorize");
    expect(authorizationBody.get("code")).toBe("5221");

    await invokeAdminMedia("remove-avatar", { playerId: "player" });
    const mediaBody = invoke.mock.calls[1][1].body as FormData;
    expect(mediaBody.get("code")).toBeNull();
    expect(mediaBody.get("token")).toBe("signed-admin-token");
    expect(mediaBody.get("action")).toBe("remove-avatar");
  });

  it("does not enable the admin mode when the server rejects the code", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new Error("Code ist nicht korrekt."),
    });
    await expect(verifyManagementCode("wrong")).resolves.toBe(false);
    await expect(invokeAdminMedia("remove-avatar", { playerId: "player" }))
      .rejects.toThrow("nicht freigeschaltet");
  });

  it("blocks media calls after the admin mode is locked", async () => {
    await verifyManagementCode("5221");
    clearManagementCode();
    await expect(invokeAdminMedia("remove-event-photo", { photoId: "photo" }))
      .rejects.toThrow("nicht freigeschaltet");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
