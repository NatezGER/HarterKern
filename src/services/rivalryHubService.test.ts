import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc: mocks.rpc }) }));

import { getRivalryHub, mapRivalryHub } from "@/services/rivalryHubService";

describe("rivalry hub service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: { summary: {}, pairs: [] }, error: null });
  });

  it("loads summary and complete hub with one request each and explicit scope", async () => {
    await getRivalryHub("all-time", false);
    await getRivalryHub(2026, true);
    expect(mocks.rpc.mock.calls).toEqual([
      ["get_rivalry_hub", { p_season_year: null, p_include_pairs: false }],
      ["get_rivalry_hub", { p_season_year: 2026, p_include_pairs: true }],
    ]);
  });

  it("forwards cancellation to an in-flight hub request", async () => {
    const controller = new AbortController();
    const abortSignal = vi.fn().mockResolvedValue({ data: { summary: {}, pairs: [] }, error: null });
    mocks.rpc.mockReturnValueOnce({ abortSignal });
    await getRivalryHub("all-time", true, controller.signal);
    expect(abortSignal).toHaveBeenCalledOnce();
    expect(abortSignal).toHaveBeenCalledWith(controller.signal);
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });

  it("maps rivalry and direct-duel values without losing sub-threshold pairs", () => {
    const result = mapRivalryHub({ summary: { rivalryEvents: 1, directTakeovers: 5 }, pairs: [
      { playerLowId: "a", playerHighId: "b", playerLowName: "A", playerHighName: "B", rivalryEvents: 1, allDirectTakeovers: 3, rivalryDirectTakeovers: 3 },
      { playerLowId: "a", playerHighId: "c", playerLowName: "A", playerHighName: "C", rivalryEvents: 0, allDirectTakeovers: 2, rivalryDirectTakeovers: 0 },
    ] });
    expect(result.pairs).toHaveLength(2);
    expect(result.pairs[1]).toMatchObject({ rivalryEvents: 0, allDirectTakeovers: 2, levelReached: false });
  });
});
