import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ rpc: mocks.rpc }),
}));

import {
  closeRemoteEvent,
  startRemoteEvent,
} from "@/services/dataPlatformRepository";
import type { StartLiveEventInput } from "@/types/liveEvent";

const input: StartLiveEventInput = {
  name: "Regression",
  date: "2026-07-28",
  participants: [{
    id: "90000000-0000-0000-0000-000000000001",
    name: "Test Player",
    kind: "permanent",
    initials: "TP",
    avatarGradient: "",
    avatarUrl: null,
    personalBest: 2.5,
    isAk: false,
  }],
};

describe("event lifecycle repository", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
  });

  it("supports start, close and immediate second start", async () => {
    let startCount = 0;
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "sync_close_event") {
        return { data: "event-one", error: null };
      }
      startCount += 1;
      return {
        data: {
          eventId: startCount === 1 ? "event-one" : "event-two",
          participants: [{
            clientId: input.participants[0].id,
            participantId: input.participants[0].id,
            kind: "permanent",
          }],
        },
        error: null,
      };
    });

    expect((await startRemoteEvent(input)).eventId).toBe("event-one");
    await closeRemoteEvent("event-one", "manual");
    expect((await startRemoteEvent(input)).eventId).toBe("event-two");
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual([
      "sync_start_event_v2",
      "sync_close_event",
      "sync_start_event_v2",
    ]);
  });
});
