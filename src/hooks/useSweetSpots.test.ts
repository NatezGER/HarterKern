import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SweetSpot } from "@/services/sweetSpotService";
// Small hook lifecycle harness: effects/dependencies/cleanup are explicit;
// no browser layout claims are made by this test.
const harness = vi.hoisted(() => ({
  state: undefined as unknown, deps: undefined as unknown[] | undefined,
  cleanup: undefined as (() => void) | undefined, read: vi.fn(),
}));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    if (harness.state === undefined) harness.state = initial;
    return [harness.state, (next: unknown) => { harness.state = next; }];
  },
  useEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => {
    if (!harness.deps || deps.some((value,index) => value !== harness.deps?.[index])) {
      harness.cleanup?.(); harness.deps = deps; harness.cleanup = effect();
    }
  },
}));
vi.mock("@/services/sweetSpotService", () => ({ getEventSweetSpots: harness.read }));
import { useSweetSpots } from "./useSweetSpots";
const values = new Map<string, SweetSpot>([["p", {
  attemptNumber: 5, averageHundredths: 236, samples: 1, nextAttemptNumber: 5,
}]]);
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => {
  harness.cleanup?.(); harness.cleanup = undefined;
  harness.state = undefined; harness.deps = undefined; harness.read.mockReset();
});
describe("optional Sweet Spot lifecycle", () => {
  it("reads once per event/version, not per render, and clears on version changes", async () => {
    harness.read.mockResolvedValue(values);
    expect(useSweetSpots("e", 1).size).toBe(0);
    await flush();
    expect(useSweetSpots("e", 1)).toBe(values);
    expect(useSweetSpots("e", 1)).toBe(values);
    expect(harness.read).toHaveBeenCalledOnce();
    expect(useSweetSpots("e", 2).size).toBe(0);
    await flush();
    expect(useSweetSpots("e", 2)).toBe(values);
    expect(harness.read).toHaveBeenCalledTimes(2);
  });
  it("ignores late responses from old events and after unmount", async () => {
    const resolvers: ((value: Map<string, SweetSpot>) => void)[] = [];
    harness.read.mockImplementation(() => new Promise(resolve => resolvers.push(resolve)));
    useSweetSpots("old", 1);
    useSweetSpots("new", 2);
    resolvers[0](values); await flush();
    expect(useSweetSpots("new", 2).size).toBe(0);
    harness.cleanup?.();
    resolvers[1](values); await flush();
    expect(useSweetSpots("new", 2).size).toBe(0);
  });
  it("fails silently and does not fetch without an active event", async () => {
    expect(useSweetSpots("", 1).size).toBe(0);
    expect(harness.read).not.toHaveBeenCalled();
    harness.read.mockRejectedValue(new Error("timeout"));
    useSweetSpots("e", 2); await flush();
    expect(useSweetSpots("e", 2).size).toBe(0);
  });
});
