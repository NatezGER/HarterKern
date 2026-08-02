import { describe, expect, it, vi } from "vitest";
import { createRefreshCoordinator } from "@/lib/refreshCoordinator";

describe("refresh coordinator", () => {
  it("runs a follow-up load when realtime invalidates an in-flight snapshot", async () => {
    let releaseFirst: (() => void) | undefined;
    const firstLoad = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const load = vi.fn()
      .mockImplementationOnce(() => firstLoad)
      .mockResolvedValueOnce(undefined);
    const refresh = createRefreshCoordinator(load);

    const mutationRefresh = refresh();
    const realtimeRefresh = refresh();
    expect(load).toHaveBeenCalledTimes(1);

    releaseFirst?.();
    await Promise.all([mutationRefresh, realtimeRefresh]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent cold-start requests when reruns are disabled", async () => {
    let release: (() => void) | undefined;
    const firstLoad = new Promise<void>((resolve) => {
      release = resolve;
    });
    const load = vi.fn(() => firstLoad);
    const refresh = createRefreshCoordinator(load, { rerunIfRequested: false });

    const strictModeRefresh = refresh();
    const focusRefresh = refresh();
    expect(load).toHaveBeenCalledOnce();

    release?.();
    await Promise.all([strictModeRefresh, focusRefresh]);
    expect(load).toHaveBeenCalledOnce();
  });
});
