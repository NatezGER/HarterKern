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
  getPlayerBadges,
  getPlayerPrestige,
  getPlayerProfileCore,
} from "@/services/historyProfileService";

describe("player profile core repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "players",
      "player_statistics",
      "public_hall_of_fame",
    ]);
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

    await expect(getPlayerBadges("player-1")).resolves.toEqual([
      expect.objectContaining({
        key: "player-1:fast-bronze",
        badgeKey: "fast-bronze",
        playerId: "player-1",
        tier: "bronze",
        recipientCount: 3,
        rarityPercent: 30,
        currentProgress: 450,
        nextBadgeName: "Fast Silver",
        nextThreshold: 400,
      }),
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("get_visible_player_badges", {
      p_player_id: "player-1",
    });
    expect(mocks.from).not.toHaveBeenCalled();
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
});
