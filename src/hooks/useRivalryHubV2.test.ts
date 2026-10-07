import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RivalryHubV2 } from "@/types/rivalryHub";
const h = vi.hoisted(() => ({
  state: { season: "all-time" as string | number, data: null as RivalryHubV2 | null, loading: false, error: "" },
  effect: undefined as undefined | (() => () => void),
  index: 0, setter: vi.fn(), retrySetter: vi.fn(), get: vi.fn(), invalidate: vi.fn(),
}));
vi.mock("react", () => ({
  useState: () => h.index++ === 0 ? [0,h.retrySetter] : [h.state,h.setter],
  useEffect: (effect: () => () => void) => { h.effect = effect; },
}));
vi.mock("@/services/rivalryHubV2Service", () => ({
  getRivalryHubV2: h.get, rivalryHubV2Cache: { invalidate: h.invalidate },
}));
import { useRivalryHubV2 } from "./useRivalryHubV2";
describe("Rivalry V2 hook lifecycle with controlled hook primitives", () => {
  beforeEach(() => { vi.clearAllMocks(); h.index=0;
    h.state = { season:"all-time", data:{ season:"all-time",pairs:[],summary:{rivalryEvents:0,playersWithRivalry:0,directTakeovers:0} },loading:false,error:"" };
  });
  it("hides the old snapshot immediately, before the new scope effect runs", () => {
    const result=useRivalryHubV2(2026);
    expect(result.data).toBeNull();
    expect(result.loading).toBe(true);
    expect(h.get).not.toHaveBeenCalled();
  });
  it("ignores late results after cleanup and aborts only its consumer", async () => {
    let resolve!: (data: RivalryHubV2) => void;
    h.get.mockImplementation(() => new Promise(r => { resolve=r; }));
    useRivalryHubV2("all-time");
    const cleanup=h.effect!();
    const signal=h.get.mock.calls[0][1] as AbortSignal;
    cleanup();
    h.setter.mockClear();
    resolve(h.state.data!);
    await Promise.resolve();
    expect(signal.aborted).toBe(true);
    expect(h.setter).not.toHaveBeenCalled();
  });
  it("retry invalidates only the requested scope", () => {
    const result=useRivalryHubV2(2026);
    result.retry();
    const matches=h.invalidate.mock.calls[0][0] as (key:string)=>boolean;
    expect(matches("2026")).toBe(true);
    expect(matches("all-time")).toBe(false);
    expect(h.retrySetter).toHaveBeenCalledOnce();
  });
});
