import { beforeEach, describe, expect, it, vi } from "vitest";

// Node-only effect harness: exercise lifecycle and result guards without a browser.
const harness = vi.hoisted(() => ({
  values: [] as unknown[], slot: 0, effectSlot: 0,
  effects: [] as { deps: unknown[]; cleanup?: () => void }[],
  pending: [] as (() => void)[], rpc: vi.fn(),
}));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const slot = harness.slot++;
    if (!(slot in harness.values)) harness.values[slot] = initial;
    return [harness.values[slot], (next: unknown) => {
      harness.values[slot] = typeof next === "function" ? next(harness.values[slot]) : next;
    }];
  },
  useEffect: (setup: () => (() => void) | undefined, deps: unknown[]) => {
    const slot = harness.effectSlot++;
    const previous = harness.effects[slot];
    if (previous && deps.every((value, index) => Object.is(value, previous.deps[index]))) return;
    harness.pending.push(() => {
      previous?.cleanup?.();
      harness.effects[slot] = { deps, cleanup: setup() };
    });
  },
}));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc: harness.rpc }) }));
import { useStatisticDashboard } from "./useStatisticDashboard";
import { usePerformanceDashboard } from "./usePerformanceDashboard";
import { statisticDashboardCache } from "@/services/statDashboardService";
import { performanceDashboardCache } from "@/services/performanceDashboardService";
import { invalidateDataGroups } from "@/services/dataGroupService";

function render<T>(hook: () => T) {
  harness.slot = 0; harness.effectSlot = 0;
  const value = hook();
  harness.pending.splice(0).forEach((effect) => effect());
  return value;
}
function unmount() { harness.effects.forEach((effect) => effect.cleanup?.()); }
const settle = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
beforeEach(() => {
  unmount();
  harness.values = []; harness.effects = []; harness.pending = [];
  harness.rpc.mockReset();
  statisticDashboardCache.invalidate(); performanceDashboardCache.invalidate();
});

describe("statistics hook lifecycle", () => {
  it("does not read when inactive or before the route group is ready", () => {
    render(() => useStatisticDashboard(2026, 1, false));
    render(() => useStatisticDashboard(2026, 0, true));
    expect(harness.rpc).not.toHaveBeenCalled();
  });
  it("deduplicates mount/version effects and ignores an obsolete season result", async () => {
    const replies: ((value: unknown) => void)[] = [];
    harness.rpc.mockImplementation(() => new Promise((resolve) => replies.push(resolve)));
    render(() => useStatisticDashboard("all-time", 1));
    render(() => useStatisticDashboard("all-time", 2));
    expect(harness.rpc).toHaveBeenCalledOnce();
    render(() => useStatisticDashboard(2026, 3));
    expect(harness.rpc).toHaveBeenCalledTimes(2);
    replies[1]({ data: { metrics: [], rivalryPairs: [] }, error: null });
    await settle();
    expect(render(() => useStatisticDashboard(2026, 3)).data?.scope).toBe("season");
    replies[0]({ data: { metrics: [], rivalryPairs: [] }, error: null });
    await settle();
    expect(render(() => useStatisticDashboard(2026, 3)).data?.scope).toBe("season");
    expect(render(() => useStatisticDashboard("all-time", 4)).data).toBeNull();
    await settle();
    expect(render(() => useStatisticDashboard("all-time", 4)).data?.scope).toBe("all-time");
    expect(harness.rpc).toHaveBeenCalledTimes(2);
  });
  it("refreshes after targeted realtime invalidation and leaves an unmounted hook untouched", async () => {
    harness.rpc.mockResolvedValue({ data: { metrics: [], rivalryPairs: [] }, error: null });
    render(() => useStatisticDashboard(2026, 1));
    await settle();
    invalidateDataGroups(["statistics"]);
    render(() => useStatisticDashboard(2026, 2));
    await settle();
    expect(harness.rpc).toHaveBeenCalledTimes(2);
    let resolve!: (value: unknown) => void;
    harness.rpc.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(() => useStatisticDashboard(2027, 3));
    const state = harness.values[1];
    unmount();
    resolve({ data: null, error: null });
    await settle();
    expect(harness.values[1]).toBe(state);
  });
  it("uses the same independent lifecycle for the isolated Performance read", async () => {
    harness.rpc.mockResolvedValue({ data: { metrics: [], players: [], attemptNumbers: [] }, error: null });
    render(() => usePerformanceDashboard(2026, 1));
    render(() => usePerformanceDashboard(2026, 2));
    await settle();
    expect(harness.rpc.mock.calls).toEqual([["get_statistics_performance_dashboard", { p_season_year: 2026 }]]);
    expect(render(() => usePerformanceDashboard(2026, 2)).data?.season).toBe(2026);
    invalidateDataGroups(["performance"]);
    render(() => usePerformanceDashboard(2026, 3));
    await settle();
    expect(harness.rpc).toHaveBeenCalledTimes(2);
  });
});
