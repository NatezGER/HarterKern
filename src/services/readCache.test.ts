import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadCache, statisticReadKey } from "./readCache";

afterEach(() => vi.restoreAllMocks());
describe("short scoped read cache", () => {
  it("keys source, season, event and canonical player set independently", () => {
    const key = statisticReadKey("compare", 2026, undefined, ["b", null, "a", "a"]);
    expect(key).toBe(statisticReadKey("compare", 2026, undefined, ["a", "b"]));
    expect(key).not.toBe(statisticReadKey("compare", "all-time", undefined, ["a", "b"]));
    expect(key).not.toBe(statisticReadKey("compare", 2026, "event", ["a", "b"]));
    expect(key).not.toBe(statisticReadKey("unified", 2026, undefined, ["a", "b"]));
  });
  it("does not cache failures and applies a focus cooldown", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
    const cache = new ReadCache<number>();
    const load = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(2);
    await expect(cache.read("scope", load)).rejects.toThrow("timeout");
    expect(cache.shouldRefresh("scope")).toBe(false);
    now.mockReturnValue(15_001);
    expect(cache.shouldRefresh("scope")).toBe(true);
    expect(await cache.read("scope", load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not schedule focus reads while a request is pending", async () => {
    const cache = new ReadCache<number>();
    let done!: (value: number) => void;
    const task = cache.read("scope", () => new Promise((resolve) => { done = resolve; }));
    expect(cache.shouldRefresh("scope")).toBe(false);
    done(3);
    await task;
    expect(cache.shouldRefresh("scope")).toBe(false);
  });
  it("does not repeat a dirty read after its last route consumer leaves", async () => {
    const cache = new ReadCache<number>();
    const owner = new AbortController();
    let done!: (value: number) => void;
    const loader = vi.fn(() => new Promise<number>((resolve) => { done = resolve; }));
    const task = cache.read("scope", loader, owner.signal);
    cache.invalidate();
    owner.abort();
    done(1);
    await task;
    expect(loader).toHaveBeenCalledOnce();
    // Old result was NOT cached; a later route reads current data.
    expect(await cache.read("scope", async () => 2)).toBe(2);
  });
  it("keeps a shared read alive for another active consumer", async () => {
    const cache = new ReadCache<number>();
    const first = new AbortController();
    const second = new AbortController();
    const replies: ((value: number) => void)[] = [];
    const loader = vi.fn(() => new Promise<number>((done) => replies.push(done)));
    const task = cache.read("scope", loader, first.signal);
    expect(cache.read("scope", loader, second.signal)).toBe(task);
    cache.invalidate();
    first.abort();
    replies[0](1);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    replies[1](2);
    expect(await task).toBe(2);
  });
});
