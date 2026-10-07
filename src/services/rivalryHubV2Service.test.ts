import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getPublicUrl: vi.fn(() => ({ data: { publicUrl: "avatar-url" } })) }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({
  rpc: mocks.rpc, storage: { from: () => ({ getPublicUrl: mocks.getPublicUrl }) },
}) }));
import { getRivalryHubV2, mapRivalryHubV2, rivalryHubV2Cache } from "./rivalryHubV2Service";
const payload = (seasonYear: number | null) => ({ seasonYear, pairs: [], summary: {} });
describe("Rivalry Hub V2 isolated snapshot", () => {
  beforeEach(() => { vi.clearAllMocks(); rivalryHubV2Cache.invalidate(); });
  it("deduplicates reads per scope and makes no cross-tab calls", async () => {
    mocks.rpc.mockImplementation((_name, args) => Promise.resolve({ data: payload(args.p_season_year), error: null }));
    await Promise.all([getRivalryHubV2(), getRivalryHubV2()]);
    await getRivalryHubV2(2026);
    await getRivalryHubV2();
    expect(mocks.rpc.mock.calls).toEqual([
      ["get_rivalry_hub_v2", { p_season_year: null }],
      ["get_rivalry_hub_v2", { p_season_year: 2026 }],
    ]);
  });
  it("rejects wrong-scope and malformed snapshots instead of showing stale data", () => {
    expect(() => mapRivalryHubV2(payload(null), 2026)).toThrow("Scope");
    expect(() => mapRivalryHubV2({ seasonYear: 2026 }, 2026)).toThrow();
  });
  it("maps server score/status without recomputing and resolves avatar paths", () => {
    const result = mapRivalryHubV2({ ...payload(2026), pairs: [{
      playerAId: "a", playerBId: "b", playerAAvatarPath: "a.webp",
      rivalryScore: 999, intensityPercent: null, rivalryLength: 0,
      rivalryStatusAllTime: true, historicalRivalry: true, formalRivalryInScope: false,
      rivalryLengthAllTime: 3,
    }] }, 2026);
    expect(result.pairs[0]).toMatchObject({ rivalryScore: 999, intensityPercent: null,
      rivalryLength: 0, rivalryLengthAllTime: 3, historicalRivalry: true, playerAAvatarUrl: "avatar-url" });
  });
  it("does not cache failures and supports explicit invalidation", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("offline") })
      .mockResolvedValue({ data: payload(null), error: null });
    await expect(getRivalryHubV2()).rejects.toThrow("offline");
    await getRivalryHubV2();
    rivalryHubV2Cache.invalidate(key => key === "all-time");
    await getRivalryHubV2();
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });
  it("isolates seasons when the old request resolves last", async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.rpc.mockImplementation((_name, args) => args.p_season_year == null
      ? new Promise(resolve => { resolveOld = resolve; })
      : Promise.resolve({ data: payload(2026), error: null }));
    const old = getRivalryHubV2();
    expect((await getRivalryHubV2(2026)).season).toBe(2026);
    resolveOld({ data: payload(null), error: null });
    expect((await old).season).toBe("all-time");
    expect((await getRivalryHubV2(2026)).season).toBe(2026);
  });
});
