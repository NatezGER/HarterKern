import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: mocks.from,
    storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: path } }) }) },
  }),
}));

import { getEventLeadPlayerStatistics } from "@/services/statsService";

function query(data: unknown[]) {
  const response = { data, error: null };
  const value = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), then: undefined as unknown,
  };
  value.select.mockReturnValue(value);
  value.eq.mockReturnValue(value);
  value.order.mockReturnValue(value);
  Object.assign(value, {
    then: (resolve: (result: { data: unknown[]; error: null }) => unknown) => resolve(response),
  });
  return value;
}

describe("event lead player statistics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads season-scoped stable player values", async () => {
    const builder = query([{
      player_id: "player-1", display_name: "Leader", avatar_url: null,
      avatar_path: null, season_year: 2026, total_lead_seconds: 5400,
      lead_takeovers: 2, lead_losses: 1, events_led: 3,
      longest_lead_seconds: 2400, lead_segment_count: 4,
      qualified_event_duration_seconds: 10800, lead_share_percent: 50,
      average_lead_seconds: 1350,
      event_best_breaks: 3,
    }]);
    mocks.from.mockReturnValue(builder);

    const result = await getEventLeadPlayerStatistics(2026);

    expect(mocks.from).toHaveBeenCalledWith("event_lead_player_statistics_v2");
    expect(builder.eq).toHaveBeenCalledWith("season_year", 2026);
    expect(result[0]).toMatchObject({
      playerId: "player-1", totalLeadSeconds: 5400,
      leadTakeovers: 2, leadLosses: 1,
      eventBestBreaks: 3,
    });
  });
});
