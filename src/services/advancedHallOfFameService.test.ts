import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc }) }));

import { getEventFirstAttemptBenchmarks, getRankedOfficialAttempts, getTwoInSixtyHallOfFame } from "@/services/advancedHallOfFameService";

describe("advanced Hall of Fame RPC reads", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("requests the selected secret ranking mode and maps one row per player", async () => {
    rpc.mockResolvedValue({ data: [{ rank: 1, player_id: "p1", display_name: "Paul",
      run_count: 3, first_time_hundredths: 220, second_time_hundredths: 260,
      sum_hundredths: 480, event_id: "e1", event_name: "Event", event_date: "2026-09-01" }], error: null });
    const entries = await getTwoInSixtyHallOfFame("frequency");
    expect(rpc).toHaveBeenCalledWith("get_two_in_sixty_hall_of_fame", { p_mode: "frequency" });
    expect(entries).toMatchObject([{ rank: 1, playerName: "Paul", runCount: 3, sumHundredths: 480 }]);
  });

  it("requests bounded official-attempt pages without loading all history", async () => {
    rpc.mockResolvedValue({ data: [{ rank: 2, total_count: 150, source_id: "a1",
      source_type: "attempt", player_id: "p1", guest_id: null,
      display_name: "Paul", time_hundredths: 206, event_name: "Event",
      source_label: null, occurred_date: "2026-09-01", attempt_number: 4 }], error: null });
    const page = await getRankedOfficialAttempts(50);
    expect(rpc).toHaveBeenCalledWith("get_ranked_official_attempts", { p_limit: 50, p_offset: 50 });
    expect(page).toMatchObject({ totalCount: 150, entries: [{ rank: 2, attemptNumber: 4 }] });
  });

  it("loads every active-event benchmark in one RPC", async () => {
    rpc.mockResolvedValue({ data: [
      { player_id: "p1", best_time_hundredths: 284 },
      { player_id: "p2", best_time_hundredths: 301 },
    ], error: null });
    const benchmarks = await getEventFirstAttemptBenchmarks("event-1");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_event_first_attempt_benchmarks", { p_event_id: "event-1" });
    expect(benchmarks.get("p1")).toBe(284);
    expect(benchmarks.get("p2")).toBe(301);
  });

  it("propagates optional-read errors for local fallback UI", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(getTwoInSixtyHallOfFame("best")).rejects.toThrow("unavailable");
  });
});
