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

const existingPlayer = {
  id: "90000000-0000-0000-0000-000000000001",
  name: "Test Player",
  kind: "permanent" as const,
  source: "existing-player" as const,
  initials: "TP",
  avatarGradient: "",
  avatarUrl: null,
  personalBest: 2.5,
  isAk: false,
};

const secondExistingPlayer = {
  ...existingPlayer,
  id: "10000000-0000-0000-0000-000000000003",
  name: "Jonas",
  initials: "JO",
};

const input: StartLiveEventInput = {
  name: "Regression",
  date: "2026-07-28",
  participants: [existingPlayer],
};

describe("event lifecycle repository", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
  });

  it("sends canonical ids for existing profiles independent of UUID version bits", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        eventId: "event-one",
        participants: [existingPlayer, secondExistingPlayer].map((participant) => ({
          clientId: participant.id,
          participantId: participant.id,
          kind: participant.kind,
        })),
      },
      error: null,
    });

    await startRemoteEvent({
      ...input,
      participants: [existingPlayer, secondExistingPlayer],
    });

    expect(mocks.rpc).toHaveBeenCalledWith("sync_start_event_v2", expect.objectContaining({
      p_participants: [
        expect.objectContaining({ id: existingPlayer.id, kind: "permanent" }),
        expect.objectContaining({ id: secondExistingPlayer.id, kind: "permanent" }),
      ],
    }));
  });

  it("only omits ids for a new permanent player and a new guest", async () => {
    const newPlayer = {
      ...existingPlayer,
      id: "temporary-player",
      name: "New Player",
      source: "new-player" as const,
    };
    const guest = {
      ...existingPlayer,
      id: "temporary-guest",
      name: "Event Guest",
      kind: "guest" as const,
      source: "new-guest" as const,
    };
    mocks.rpc.mockResolvedValue({
      data: {
        eventId: "event-one",
        participants: [existingPlayer, newPlayer, guest].map((participant) => ({
          clientId: participant.id,
          participantId: participant.id,
          kind: participant.kind,
        })),
      },
      error: null,
    });

    await startRemoteEvent({
      ...input,
      participants: [existingPlayer, newPlayer, guest],
    });

    const payload = mocks.rpc.mock.calls[0][1].p_participants;
    expect(payload).toEqual([
      expect.objectContaining({ id: existingPlayer.id, kind: "permanent" }),
      expect.not.objectContaining({ id: expect.anything() }),
      expect.not.objectContaining({ id: expect.anything() }),
    ]);
    expect(payload[1]).toMatchObject({ kind: "permanent", name: "New Player" });
    expect(payload[2]).toMatchObject({ kind: "guest", name: "Event Guest" });
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
    const startPayloads = mocks.rpc.mock.calls
      .filter(([name]) => name === "sync_start_event_v2")
      .map(([, args]) => args.p_participants);
    expect(startPayloads).toEqual([
      [expect.objectContaining({ id: existingPlayer.id })],
      [expect.objectContaining({ id: existingPlayer.id })],
    ]);
  });
});
