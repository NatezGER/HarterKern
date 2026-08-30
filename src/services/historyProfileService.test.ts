import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: vi.fn() },
  }),
}));

import {
  getAttemptBadgeUnlocks,
  getClosedEventIds,
  getPlayerCompareTimeline,
  getPlayerPersonalProgression,
  getPlayerBadges,
  getPlayerBingo,
  getPlayerAttemptNumbers,
  getPlayerEventHistory,
  getPlayerTimePerformance,
  getPlayerPrestige,
  getPlayerProfileCore,
  getPlayerSeasonProfile,
  getPlayerProgression,
  getPlayerTrophies,
} from "@/services/historyProfileService";

describe("player profile core repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { total_lead_seconds: 3900, event_best_breaks: 4 }, error: null,
      }),
    });
    const rows: Record<string, unknown> = {
      players: {
        id: "player-1",
        display_name: "Paul",
        avatar_path: null,
        avatar_url: null,
        is_ak: false,
      },
      player_statistics: {
        personal_best_hundredths: 250,
        average_hundredths: 320,
        event_participations: 3,
        event_wins: 1,
        second_places: 1,
        third_places: 0,
        valid_attempts: 10,
        dnf_count: 2,
      },
      public_hall_of_fame: { rank: 2 },
    };
    mocks.from.mockImplementation((table: string) => {
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn(async () => ({ data: rows[table], error: null })),
      };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      return builder;
    });
  });

  it("uses only the selected player, statistics and rank reads", async () => {
    await expect(getPlayerProfileCore("player-1")).resolves.toMatchObject({
      id: "player-1",
      name: "Paul",
      rank: 2,
      personalBestHundredths: 250,
      eventLeadSeconds: 3900,
      eventBestBreaks: 4,
    });
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "players",
      "player_statistics",
      "public_hall_of_fame",
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_event_lead_statistics", {
      p_player_id: "player-1", p_season_year: null,
    });
  });

  it("resolves shared event IDs through one closed-event query", async () => {
    const builder = {
      select: vi.fn(),
      in: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.is.mockResolvedValue({ data: [{ id: "closed-event" }], error: null });
    mocks.from.mockReturnValueOnce(builder);

    await expect(getClosedEventIds(["closed-event", "active-event"]))
      .resolves.toEqual(["closed-event"]);
    expect(mocks.from).toHaveBeenCalledWith("events");
    expect(builder.in).toHaveBeenCalledWith("id", ["closed-event", "active-event"]);
    expect(builder.eq).toHaveBeenCalledWith("status", "closed");
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("loads both players' closed chronological attempts through one season-aware read", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      is: vi.fn(),
      gte: vi.fn(),
      lt: vi.fn(),
      order: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);
    builder.is.mockReturnValue(builder);
    builder.gte.mockReturnValue(builder);
    builder.lt.mockReturnValue(builder);
    builder.order
      .mockReturnValueOnce(builder)
      .mockResolvedValueOnce({
        data: [{
          id: "attempt-1", event_id: "event-1", player_id: "player-a",
          time_hundredths: 299, is_dnf: false, submitted_at: "2026-01-01T12:00:00Z",
          events: { name: "Finale", start_date: "2026-01-01", closed_at: "2026-01-01T13:00:00Z", ends_at: "2026-01-01T14:00:00Z" },
        }],
        error: null,
      });
    mocks.from.mockReturnValueOnce(builder);

    await expect(getPlayerCompareTimeline("player-a", "player-b", 2026)).resolves.toEqual([{
      id: "attempt-1", eventId: "event-1", eventName: "Finale", eventDate: "2026-01-01",
      eventEndAt: "2026-01-01T13:00:00Z", playerId: "player-a", timeHundredths: 299,
      isDnf: false, submittedAt: "2026-01-01T12:00:00Z", attemptNumber: 1,
    }]);
    expect(mocks.from).toHaveBeenCalledWith("attempts");
    expect(builder.in).toHaveBeenCalledWith("player_id", ["player-a", "player-b"]);
    expect(builder.eq).toHaveBeenCalledWith("events.status", "closed");
    expect(builder.gte).toHaveBeenCalledWith("events.start_date", "2026-01-01");
    expect(builder.lt).toHaveBeenCalledWith("events.start_date", "2027-01-01");
    expect(builder.order).toHaveBeenNthCalledWith(1, "submitted_at");
    expect(builder.order).toHaveBeenNthCalledWith(2, "id");
  });

  it("loads all-time compare progression through one player-scoped history read", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.order.mockResolvedValue({
      data: [{
        source_id: "pb-1", time_hundredths: 275, achieved_at: "2025-06-01T12:00:00Z",
        achieved_date: "2025-06-01", event_id: "event-1", source_label: "Sommerfest",
        source_type: "attempt", previous_best_hundredths: 300, improvement_hundredths: 25,
        duration_days: 8, is_current: true,
      }],
      error: null,
    });
    mocks.from.mockReturnValueOnce(builder);

    await expect(getPlayerPersonalProgression("player-a")).resolves.toEqual([
      expect.objectContaining({ id: "pb-1", timeHundredths: 275, eventId: "event-1" }),
    ]);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("player_pb_history");
    expect(builder.eq).toHaveBeenCalledWith("player_id", "player-a");
    expect(builder.order).toHaveBeenCalledWith("sequence_number");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("loads season compare progression through one player-scoped RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        source_id: "season-pb-1", time_hundredths: 290,
        achieved_at: "2026-02-01T12:00:00Z", achieved_date: "2026-02-01",
        event_id: null, source_label: "Saisonstart", source_type: "attempt",
        previous_best_hundredths: null, improvement_hundredths: null,
        duration_days: 0, is_current: true,
      }],
      error: null,
    });
    await expect(getPlayerPersonalProgression("player-b", 2026)).resolves.toEqual([
      expect.objectContaining({ id: "season-pb-1", timeHundredths: 290 }),
    ]);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_season_pb_history", {
      p_player_id: "player-b",
      p_season_year: 2026,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads visible badges through the player-scoped RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        award_key: "player-1:fast-bronze",
        player_id: "player-1",
        display_name: "Paul",
        avatar_url: null,
        avatar_path: null,
        badge_key: "fast-bronze",
        category: "performance",
        tier: "bronze",
        name: "Fast Bronze",
        description: "Unter fünf Sekunden",
        family_key: "performance-speed",
        requirement: "Zeit unter 5,00 Sekunden",
        threshold: 500,
        sort_order: 10,
        is_secret: false,
        source_type: "historical_attempt",
        source_attempt_id: null,
        source_historical_attempt_id: "attempt-1",
        source_event_id: null,
        source_event_name: null,
        source_event_date: null,
        awarded_at: "2025-01-01T00:00:00Z",
        metadata: { progress: 450, timeHundredths: 450 },
        tier_rank: 2,
        recipient_count: 3,
        regular_player_count: 10,
        rarity_percent: 30,
        source_attempt_number: null,
        source_time_hundredths: 450,
        next_badge_key: "fast-silver",
        next_badge_name: "Fast Silver",
        next_requirement: "Zeit unter 4,00 Sekunden",
        next_tier: "silver",
        next_threshold: 400,
        current_progress: 450,
        is_special_event_badge: false,
        badge_kind: "tiered",
        design_variant: "standard",
        scope_type: "all_time",
      }],
      error: null,
    });
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        badge_key: "fast-bronze", name: "Fast Bronze", tier: "bronze",
        tier_rank: 2, sort_order: 10, design_variant: "standard",
        recipient_count: 3, regular_player_count: 10, rarity_percent: 30,
        recipients: [],
      }],
      error: null,
    });

    await expect(getPlayerBadges("player-1")).resolves.toEqual([
      expect.objectContaining({
        key: "player-1:fast-bronze",
        badgeKey: "fast-bronze",
        playerId: "player-1",
        tier: "bronze",
        rarityPercent: 30,
      }),
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_visible_badges", {
      p_player_id: "player-1",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_badge_rarity");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads post-attempt unlocks from the persisted ledger projection", async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn().mockResolvedValue({
        data: [{
          award_key: "player-1:favorite-time-bronze:294",
          badge_key: "favorite-time-bronze",
          name: "Déjà-vu",
          tier: "bronze",
          description: "Dieselbe Zeit zweimal",
          category: "favorite_time",
          metadata: { timeHundredths: 294 },
        }],
        error: null,
      }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    mocks.from.mockReturnValueOnce(builder);

    await expect(getAttemptBadgeUnlocks("attempt-1", "Paul")).resolves.toEqual([
      expect.objectContaining({
        key: "player-1:favorite-time-bronze:294",
        badgeKey: "favorite-time-bronze",
        playerName: "Paul",
      }),
    ]);
    expect(mocks.from).toHaveBeenCalledWith("player_badge_award_achievements");
    expect(builder.eq).toHaveBeenCalledWith("source_attempt_id", "attempt-1");
  });

  it("uses dedicated player-scoped RPCs for extended profile reads", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ time_hundredths: 300 }], error: null })
      .mockResolvedValueOnce({ data: [{ attempt_number: 1, attempt_count: 2,
        valid_attempts: 2, dnf_count: 0, average_hundredths: 350 }], error: null })
      .mockResolvedValueOnce({ data: [{ event_id: "event-1", event_name: "Finale",
        event_date: "2026-08-27", best_time_hundredths: 300, rank: 1,
        attempt_count: 2, valid_attempts: 2, dnf_count: 0 }], error: null });

    await expect(getPlayerTimePerformance("player-1")).resolves.toMatchObject({
      thresholds: expect.any(Array), medianHundredths: 300,
    });
    await expect(getPlayerAttemptNumbers("player-1")).resolves.toEqual([
      expect.objectContaining({ attemptNumber: 1, samples: 2 }),
    ]);
    await expect(getPlayerEventHistory("player-1")).resolves.toEqual([
      expect.objectContaining({ eventId: "event-1", rank: 1 }),
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_qualified_times", {
      p_player_id: "player-1", p_season_year: null,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_attempt_number_statistics", {
      p_player_id: "player-1",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_event_history", {
      p_player_id: "player-1",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads event and season trophies through the player-scoped career RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        trophy_key: "event-trophy:event-1:player-1:1",
        competition_type: "event",
        scope_type: "event",
        competition_id: "event-1",
        season_key: null,
        competition_name: "Special Finale",
        competition_year: 2026,
        event_date: "2026-07-31",
        placement: 1,
        trophy_tier: "gold",
        player_id: "player-1",
        guest_id: null,
        display_name: "Paul",
        awarded_at: "2026-07-31T20:00:00Z",
      }, {
        trophy_key: "season-trophy:2026:player-1:1",
        competition_type: "season",
        scope_type: "season",
        competition_id: "00000000-0000-0000-0000-000000002026",
        season_key: "2026",
        competition_name: "Saisonmeister 2026",
        competition_year: 2026,
        event_date: "2026-12-31",
        placement: 1,
        trophy_tier: "gold",
        player_id: "player-1",
        guest_id: null,
        display_name: "Paul",
        awarded_at: "2027-01-02T18:00:00Z",
      }],
      error: null,
    });

    await expect(getPlayerTrophies("player-1")).resolves.toEqual([
      expect.objectContaining({
        competitionType: "event",
        competitionName: "Special Finale",
      }),
      expect.objectContaining({
        competitionType: "season",
        seasonKey: "2026",
        competitionName: "Saisonmeister 2026",
        placement: 1,
      }),
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_trophies", {
      p_player_id: "player-1",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads an empty-safe player season profile through its isolated RPC", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        player_id: "player-1", personal_best_hundredths: null, season_rank: null,
        average_hundredths: null, event_participations: 0, event_wins: 0,
        second_places: 0, third_places: 0, valid_attempts: 0, dnf_count: 0,
      },
      error: null,
    });
    mocks.rpc.mockReturnValueOnce({ maybeSingle });
    await expect(getPlayerSeasonProfile("player-1", 2026)).resolves.toMatchObject({
      rank: null, personalBestHundredths: null, validAttempts: 0, dnfCount: 0,
      eventLeadSeconds: 3900, eventBestBreaks: 4,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_season_profile", {
      p_player_id: "player-1", p_season_year: 2026,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_event_lead_statistics", {
      p_player_id: "player-1", p_season_year: 2026,
    });
  });

  it("loads prestige without recalculating badges and uses the supplied count", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        player_id: "player-1",
        pb_count: 4,
        largest_pb_improvement_hundredths: 80,
        average_pb_improvement_hundredths: 35,
        world_record_count: 2,
        world_record_days: 20,
        longest_world_record_days: 15,
      },
      error: null,
    });
    mocks.rpc.mockReturnValueOnce({ maybeSingle });

    await expect(getPlayerPrestige("player-1", 7)).resolves.toEqual({
      pbCount: 4,
      largestPbImprovementHundredths: 80,
      averagePbImprovementHundredths: 35,
      worldRecordCount: 2,
      worldRecordDays: 20,
      longestWorldRecordDays: 15,
      visibleBadgeCount: 7,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_profile_prestige", {
      p_player_id: "player-1",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("uses isolated season PB and WR read models for season progression", async () => {
    const worldRows = [{
      season_year: 2026,
      record_id: "wr-1", player_id: "player-2", display_name: "Anna",
      avatar_url: null, avatar_path: null, time_hundredths: 300,
      achieved_at: "2026-01-01T10:00:00Z", achieved_date: "2026-01-01",
      event_id: null, source_label: "Historischer Einzelversuch",
      source_type: "historical_attempt", sequence_number: 1,
      previous_record_hundredths: null, improvement_hundredths: null,
      period_end_date: null, duration_days: 1, is_current: true,
    }];
    const order = vi.fn().mockResolvedValue({ data: worldRows, error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValueOnce({ select });
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        source_id: "pb-1", player_id: "player-1", display_name: "Paul",
        time_hundredths: 320, achieved_at: "2026-01-02T10:00:00Z",
        achieved_date: "2026-01-02", event_id: null,
        source_label: "Historischer Einzelversuch", source_type: "historical_attempt",
        sequence_number: 1, previous_best_hundredths: null,
        improvement_hundredths: null, period_end_date: null,
        duration_days: 1, is_current: true,
      }],
      error: null,
    });

    await expect(getPlayerProgression("player-1", 2026)).resolves.toMatchObject({
      personal: [{ id: "pb-1", timeHundredths: 320 }],
      worldRecords: [{ id: "wr-1", timeHundredths: 300 }],
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_season_pb_history", {
      p_player_id: "player-1", p_season_year: 2026,
    });
    expect(mocks.from).toHaveBeenCalledWith("season_world_record_history");
    expect(eq).toHaveBeenCalledWith("season_year", 2026);
  });

  it("keeps the existing All-Time progression views as the default", async () => {
    const personalOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const personalEq = vi.fn().mockReturnValue({ order: personalOrder });
    const personalSelect = vi.fn().mockReturnValue({ eq: personalEq });
    const worldOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const worldSelect = vi.fn().mockReturnValue({ order: worldOrder });
    mocks.from
      .mockReturnValueOnce({ select: personalSelect })
      .mockReturnValueOnce({ select: worldSelect });

    await expect(getPlayerProgression("player-1")).resolves.toEqual({
      personal: [], worldRecords: [],
    });
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "player_pb_history", "world_record_history",
    ]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe("player profile BINGO repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads fields, hits and summary through one player-scoped RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{
      ending: 7, ending_label: "07", hit_count: 1, field_tier: "bronze",
      hits: [{ id: "hit-1", sourceType: "attempt", eventId: "event-1",
        timeHundredths: 307, occurredAt: "2026-08-27T20:00:00Z",
        occurredDate: "2026-08-27", hasExactTime: true, sourceLabel: "Finale" }],
      collected_endings: 1, bronze_fields: 1, silver_fields: 0,
      gold_fields: 0, diamond_fields: 0, bronze_lines: 0,
      silver_lines: 0, gold_lines: 0, diamond_lines: 0,
      highest_badge_tier: null,
    }], error: null });

    await expect(getPlayerBingo("player-1")).resolves.toMatchObject({
      fields: [{ ending: 7, label: "07", hits: [{ id: "hit-1" }] }],
      summary: { collectedEndings: 1, bronzeFields: 1, bronzeLines: 0 },
    });
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("get_player_bingo", {
      p_player_id: "player-1",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
