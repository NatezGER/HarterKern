import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ from: mocks.from }) }));

import { getGlobalStatistics } from "@/services/statsService";

function builder(data: unknown) {
  const result = { data, error: null };
  const value = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  value.select.mockReturnValue(value);
  value.eq.mockReturnValue(value);
  value.order.mockReturnValue(value);
  value.limit.mockReturnValue(value);
  return value;
}

describe("season global best time", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the better qualified season time without changing event metrics", async () => {
    const statistics = builder({
      season_year: 2026, regular_players: 8, event_count: 4,
      approved_attempts: 21, valid_attempts: 20, dnf_count: 1,
      world_record_hundredths: 250, average_hundredths: 342,
    });
    const qualifiedBest = builder({ time_hundredths: 207 });
    mocks.from.mockImplementation((table: string) =>
      table === "season_global_statistics" ? statistics : qualifiedBest);

    const cards = await getGlobalStatistics(2026);

    expect(cards.find(({ id }) => id === "fastest")?.value).toBe("2,07 s");
    expect(cards.find(({ id }) => id === "valid")?.value).toBe("20");
    expect(cards.find(({ id }) => id === "dnf")?.value).toBe("1 · 4,8 %");
    expect(cards.find(({ id }) => id === "average")?.value).toBe("3,42 s");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "season_qualified_official_times");
    expect(qualifiedBest.eq).toHaveBeenCalledWith("season_year", 2026);
    expect(qualifiedBest.order).toHaveBeenCalledWith("time_hundredths");
    expect(qualifiedBest.limit).toHaveBeenCalledWith(1);
  });
});
