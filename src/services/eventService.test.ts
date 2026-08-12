import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

import { getEvents } from "@/services/eventService";

function query(data: unknown[]) {
  const result = { data, error: null };
  const builder = {
    select: vi.fn(), is: vi.fn(), order: vi.fn(), in: vi.fn(),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  builder.select.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  return builder;
}

describe("event medal loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const events = [
      { id: "two", name: "Two", start_date: "2026-01-01", started_at: "2026-01-01T18:00:00Z", ends_at: "2026-01-02T18:00:00Z", status: "closed", awards_trophies: false },
      { id: "three", name: "Three", start_date: "2026-02-01", started_at: "2026-02-01T18:00:00Z", ends_at: "2026-02-02T18:00:00Z", status: "closed", awards_trophies: false },
      { id: "special", name: "Special", start_date: "2026-03-01", started_at: "2026-03-01T18:00:00Z", ends_at: "2026-03-02T18:00:00Z", status: "closed", awards_trophies: true },
    ];
    const podium = [
      { event_id: "two", player_id: "p1", guest_id: null, display_name: "One", avatar_url: null, is_guest: false, best_time_hundredths: 300, rank: 1 },
      { event_id: "three", player_id: "p1", guest_id: null, display_name: "One", avatar_url: null, is_guest: false, best_time_hundredths: 290, rank: 1 },
      { event_id: "special", player_id: "p1", guest_id: null, display_name: "One", avatar_url: null, is_guest: false, best_time_hundredths: 280, rank: 1 },
    ];
    const rows: Record<string, unknown[]> = {
      events,
      event_statistics: events.map(({ id }) => ({ event_id: id, participant_count: 0, valid_attempts: 1, dnf_count: 0, fastest_hundredths: 300, average_hundredths: 300 })),
      event_participants: [], event_guests: [], event_podium: podium,
      event_winners: podium.map(({ event_id, display_name }) => ({ event_id, display_name })),
    };
    mocks.from.mockImplementation((table: string) => query(rows[table] ?? []));
    mocks.rpc.mockImplementation(() => query([{ event_id: "three" }]));
  });

  it("loads raw event data while showing medals only for qualified normal events", async () => {
    const events = await getEvents();

    expect(events.find(({ id }) => id === "two")).toMatchObject({
      winnerNames: ["One"], podium: [], validAttempts: 1,
    });
    expect(events.find(({ id }) => id === "three")?.podium).toHaveLength(1);
    expect(events.find(({ id }) => id === "special")).toMatchObject({
      winnerNames: ["One"], podium: [], awardsTrophies: true,
    });
    expect(mocks.from).toHaveBeenCalledWith("event_podium");
    expect(mocks.rpc).toHaveBeenCalledWith("get_medal_qualified_events", {
      p_event_ids: null,
    });
    expect(mocks.from).not.toHaveBeenCalledWith("qualified_event_podium");
  });

  it("loads dashboard event data without any medal qualification query", async () => {
    const events = await getEvents("all-time", false);

    expect(events).toHaveLength(3);
    expect(events[0].winnerNames).toEqual(["One"]);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalledWith("event_podium");
  });
});
