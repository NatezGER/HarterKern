import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: mocks.from,
    storage: { from: vi.fn() },
  }),
}));

import { getPlayerProfileCore } from "@/services/historyProfileService";

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
});
