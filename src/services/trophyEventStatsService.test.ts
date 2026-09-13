import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), storageFrom: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    rpc: mocks.rpc,
    storage: { from: mocks.storageFrom },
  }),
}));

import { getTrophyEventSpecialStats } from "@/services/trophyEventStatsService";

const hit = (id: string, name: string, guestId: string | null = null) => ({
  id,
  playerId: guestId ? null : `player-${id}`,
  guestId,
  playerName: name,
  avatarUrl: null,
  avatarPath: null,
  isGuest: Boolean(guestId),
  timeHundredths: 342,
  occurredAt: `2026-09-05T18:0${id.slice(-1)}:00Z`,
  occurredDate: "2026-09-05",
  hasExactTime: true,
  sourceType: "attempt",
  sourceOrder: Number(id.slice(-1)),
});

const payload = {
  eventId: "event-a",
  eventName: "Trophy A",
  endings: [{
    ending: 42,
    label: "42",
    achieved: true,
    hitCount: 2,
    participantCount: 2,
    playerId: null,
    guestId: "guest-1",
    playerName: "Gast",
    avatarUrl: null,
    avatarPath: null,
    isGuest: true,
    timeHundredths: 342,
    occurredAt: "2026-09-05T18:01:00Z",
    occurredDate: "2026-09-05",
    hasExactTime: true,
    eventId: "event-a",
    sourceType: "attempt",
    sourceOrder: 1,
    sourceLabel: "Trophy A",
    hits: [hit("hit-1", "Gast", "guest-1"), hit("hit-2", "Paul")],
  }],
  topHunters: [{
    id: "guest:guest-1", playerId: null, guestId: "guest-1",
    playerName: "Gast", avatarUrl: null, avatarPath: null, isGuest: true,
    endingCount: 1,
  }],
  metrics: {
    bingoLines: 1,
    distinctEndings: 1,
    snapEndings: 0,
    matchingTimeParticipantCount: 2,
    matchingTimeHundredths: 342,
    matchingTimeParticipantNames: ["Gast", "Paul"],
    validAttempts: 2,
    mostCommonEnding: 42,
    mostCommonEndingHits: 2,
  },
};

describe("Trophy event special-stat service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageFrom.mockReturnValue({
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
    });
    mocks.rpc.mockResolvedValue({ data: payload, error: null });
  });

  it("loads the complete event read model with exactly one request", async () => {
    const result = await getTrophyEventSpecialStats("event-a");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("get_trophy_event_special_stats", {
      p_event_id: "event-a",
    });
    expect(result?.mostWanted).toMatchObject({
      reached: 1,
      mostCommonEnding: 42,
      mostCommonHits: 2,
    });
  });

  it("keeps the first finder, later hits and guest Top Hunter identity", async () => {
    const result = await getTrophyEventSpecialStats("event-a");
    expect(result?.mostWanted.endings[0]).toMatchObject({
      playerName: "Gast",
      guestId: "guest-1",
      isGuest: true,
      hitCount: 2,
      participantCount: 2,
    });
    expect(result?.mostWanted.endings[0].additionalHits.map(({ playerName }) => playerName))
      .toEqual(["Paul"]);
    expect(result?.mostWanted.topHunters[0]).toMatchObject({
      id: "guest:guest-1", guestId: "guest-1", isGuest: true, endingCount: 1,
    });
  });

  it("returns null when the event is not a Trophy Event", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(getTrophyEventSpecialStats("normal-event")).resolves.toBeNull();
  });
});
