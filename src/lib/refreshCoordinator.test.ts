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
});
