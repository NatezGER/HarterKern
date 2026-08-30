import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: mocks.storageFrom },
  }),
}));

import {
  getEventDetail,
  getEventDetailExtras,
} from "@/services/historyProfileService";

type QueryResult = { data: unknown; error: unknown };

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  return builder;
}

const event = {
  id: "event-1",
  name: "Finale",
  start_date: "2026-08-17",
  started_at: "2026-08-17T18:00:00Z",
  closed_at: "2026-08-17T20:00:00Z",
  status: "closed",
  description: null,
  is_important: false,
  awards_trophies: true,
};

const playerAttempt = (id: string, attemptNumber: number, time: number) => ({
  attempt_id: id,
  event_id: event.id,
  player_id: "player-1",
  guest_id: null,
  display_name: "Paul",
  avatar_path: null,
  avatar_url: null,
  is_guest: false,
  is_ak: false,
  time_hundredths: time,
  is_dnf: false,
  submitted_at: `2026-08-17T18:${String(attemptNumber).padStart(2, "0")}:00Z`,
  attempt_number: attemptNumber,
  participant_rank: 1,
  is_personal_best: attemptNumber === 1,
  is_world_record: false,
  is_event_best: attemptNumber === 1,
});

function arrangeCore(changes: Partial<Record<string, QueryResult>> = {}) {
  const results: Record<string, QueryResult> = {
    events: { data: event, error: null },
    event_statistics: { data: {
      participant_count: 2,
      valid_attempts: 2,
      dnf_count: 0,
      fastest_hundredths: 250,
      average_hundredths: 300,
    }, error: null },
    event_podium: { data: [], error: null },
    event_attempt_details: { data: [
      playerAttempt("attempt-1", 1, 250),
      {
        ...playerAttempt("attempt-2", 1, 350),
        player_id: null,
        guest_id: "guest-1",
        display_name: "Gast",
        is_guest: true,
        participant_rank: 2,
        is_personal_best: false,
      },
    ], error: null },
    event_final_standings: { data: [{
      event_id: event.id,
      player_id: null,
      guest_id: "guest-1",
      display_name: "Gast",
      avatar_path: null,
      avatar_url: null,
      is_guest: true,
      is_ak: false,
      attempt_count: 1,
      valid_attempts: 1,
      dnf_count: 0,
      best_time_hundredths: 350,
      average_hundredths: 350,
      first_best_at: "2026-08-17T18:01:00Z",
      rank: 2,
    }], error: null },
    event_lead_participant_statistics: { data: [{
      event_id: event.id, player_id: "player-1", lead_seconds: 600,
      event_best_breaks: 2,
    }], error: null },
    ...changes,
  };
  mocks.from.mockImplementation((table: string) => query(results[table]));
  mocks.rpc.mockReturnValue(query({ data: { event_id: event.id }, error: null }));
}

describe("event detail loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    arrangeCore();
  });

  it("loads closed-event core data independently with guests and compatible fields", async () => {
    const detail = await getEventDetail(event.id);
    expect(detail).toMatchObject({
      id: event.id,
      status: "closed",
      participants: 2,
      validAttempts: 2,
      badges: [],
      photos: [],
      trophies: [],
      extras: { loading: true, errors: {} },
    });
    expect(detail?.attempts.some(({ isGuest }) => isGuest)).toBe(true);
    expect(detail?.participantStats[0]).toMatchObject({ name: "Gast", isGuest: true });
    expect(detail?.finalStandings[0]).toMatchObject({ name: "Gast", rank: 2 });
    expect(mocks.from.mock.calls.map(([table]) => table)).toContain("event_final_standings");
    expect(mocks.from.mock.calls.map(([table]) => table))
      .not.toContain("event_participant_statistics");
    expect(mocks.from.mock.calls.map(([table]) => table)).not.toContain("event_badge_unlocks");
    expect(mocks.from.mock.calls.map(([table]) => table)).not.toContain("event_photos");
  });

  it("derives attempt-number statistics from many already loaded attempts", async () => {
    const attempts = Array.from({ length: 100 }, (_, index) =>
      playerAttempt(`attempt-${index}`, index % 2 + 1, 250 + index));
    arrangeCore({ event_attempt_details: { data: attempts, error: null } });
    const detail = await getEventDetail(event.id);
    expect(detail?.attemptNumbers).toHaveLength(2);
    expect(detail?.attemptNumbers[0].samples).toBe(50);
    expect(mocks.from.mock.calls.map(([table]) => table))
      .not.toContain("event_attempt_number_statistics");
  });

  it("returns null for a missing event without starting expensive reads", async () => {
    arrangeCore({ events: { data: null, error: null } });
    await expect(getEventDetail("missing")).resolves.toBeNull();
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps core query failures explicit", async () => {
    arrangeCore({ event_attempt_details: {
      data: null,
      error: new Error("statement timeout"),
    } });
    await expect(getEventDetail(event.id)).rejects.toThrow("statement timeout");
  });

  it("accepts empty optional collections including an event without photos", async () => {
    const empty = { data: [], error: null };
    mocks.from.mockReturnValue(query(empty));
    mocks.storageFrom.mockReturnValue({ createSignedUrls: vi.fn() });
    await expect(getEventDetailExtras(event.id)).resolves.toEqual({
      badges: [],
      photos: [],
      trophies: [],
      extras: { loading: false, errors: {} },
    });
    expect(mocks.from.mock.calls.map(([table]) => table)).not.toContain("event_photos");
  });

  it("isolates an optional query timeout instead of failing EventResults core", async () => {
    mocks.from.mockImplementation((table: string) => query(table === "event_badge_unlocks"
      ? { data: null, error: new Error("statement timeout") }
      : { data: [], error: null }));
    mocks.storageFrom.mockReturnValue({ createSignedUrls: vi.fn() });
    await expect(getEventDetailExtras(event.id)).resolves.toMatchObject({
      badges: [],
      extras: {
        loading: false,
        errors: { badges: "Badge-Unlocks konnten nicht geladen werden." },
      },
    });
  });
});
