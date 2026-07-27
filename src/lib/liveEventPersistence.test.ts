import { describe, expect, it } from "vitest";
import { createDemoLiveState } from "@/data/liveDemoData";
import { parseLiveEventState } from "@/lib/liveEventPersistence";

describe("live event persistence", () => {
  it("restores a valid persisted state", () => {
    const state = createDemoLiveState(new Date("2026-07-27T12:00:00.000Z"));
    expect(parseLiveEventState(JSON.stringify(state), createDemoLiveState)).toEqual(state);
  });

  it.each(["{broken", JSON.stringify({ version: 0 }), JSON.stringify({ version: 1, role: "admin", events: [{}], attempts: [] })])(
    "falls back safely for damaged or outdated data",
    (raw) => {
      expect(parseLiveEventState(raw, createDemoLiveState).version).toBe(1);
    },
  );
});
