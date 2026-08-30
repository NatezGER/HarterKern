import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc }) }));
import { buildEventPlayerProgressions, loadPlayerProgressionOverlays } from "@/services/playerProgressionOverlayService";

describe("multi-player progression overlays", () => {
  beforeEach(() => rpc.mockReset());

  it("builds strict event PB improvements and ignores slower, equal and DNF attempts", () => {
    const attempts = [
      ["a1", 350, false], ["a2", 380, false], ["a3", 320, false],
      ["a4", null, true], ["a5", 320, false], ["a6", 290, false],
    ].map(([id, time, dnf], index) => ({ id: String(id), playerId: "paul", name: "Paul", avatarUrl: null, isGuest: false, isAk: false, isDnf: Boolean(dnf), timeHundredths: time as number | null, submittedAt: `2026-01-01T10:0${index}:00Z`, attemptNumber: index + 1 }));
    expect(buildEventPlayerProgressions(attempts, ["paul"])[0].points.map((point) => point.timeHundredths)).toEqual([350, 320, 290]);
  });

  it("uses one batched scoped RPC and returns no request for the standard chart", async () => {
    await expect(loadPlayerProgressionOverlays([])).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: [], error: null });
    await loadPlayerProgressionOverlays(["b", "a"], 2026);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_player_progressions", { p_player_ids: ["a", "b"], p_season_year: 2026 });
  });
});
