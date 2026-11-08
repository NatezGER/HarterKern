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

  it.each(["upload-beer-image", "remove-beer-image"])("blocks unauthorized %s", async action => {
    await expect(invokeAdminMedia(action, { brand: "Königshof" })).rejects.toThrow("nicht freigeschaltet");
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each(["upload-beer-image", "remove-beer-image"])("explains an outdated server only for %s and preserves the sent action", async action => {
    await verifyManagementCode("5221");
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({error:"Unbekannte Medienaktion."}), {status:400}) } });
    await expect(invokeAdminMedia(action,{brand:"Known"})).rejects.toThrow("aktuelle Supabase-Funktion admin-media");
    expect((invoke.mock.calls.at(-1)![1].body as FormData).get("action")).toBe(action);
  });
  it.each(["Die Adminfreigabe ist abgelaufen.", "Bucket not found", "Ungültige Bildabmessungen.", "Invalid JWT"])("preserves unrelated beer error: %s", async message => {
    await verifyManagementCode("5221");
    invoke.mockResolvedValue({ data:null, error:{context:new Response(JSON.stringify({error:message}),{status:400})} });
    await expect(invokeAdminMedia("upload-beer-image",{brand:"Known"})).rejects.toThrow(message);
  });
  it.each(["upload-avatar","upload-award-asset","upload-event-photo","save-milestone-content"])("does not relabel unknown legacy action %s", async action => {
    await verifyManagementCode("5221");
    invoke.mockResolvedValue({data:null,error:new Error("Unbekannte Medienaktion.")});
    await expect(invokeAdminMedia(action,{})).rejects.toThrow("Unbekannte Medienaktion.");
  });

  it("blocks media calls after the admin mode is locked", async () => {
    await verifyManagementCode("5221");
    clearManagementCode();
    await expect(invokeAdminMedia("remove-event-photo", { photoId: "photo" }))
      .rejects.toThrow("nicht freigeschaltet");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
