import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/player-avatars/${path}` } }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc, storage: { from: () => ({ getPublicUrl }) } }) }));
import { buildEventPlayerProgressions, loadPlayerProgressionOverlays, regularPlayerOptions, resolveProgressionAvatar } from "@/services/playerProgressionOverlayService";

describe("multi-player progression overlays", () => {
  beforeEach(() => rpc.mockReset());

  it("resolves the RPC's relative storage avatar through the canonical player avatar path", () => {
    expect(resolveProgressionAvatar("/storage/v1/object/public/player-avatars/folder%2Fpaul.webp")).toBe("https://example.supabase.co/storage/v1/object/public/player-avatars/folder/paul.webp");
    expect(resolveProgressionAvatar("https://legacy.example/paul.webp")).toBe("https://legacy.example/paul.webp");
    expect(resolveProgressionAvatar(null)).toBeNull();
  });

  it.each([
    ["all-time", undefined, "alltime-player"],
    ["season", 2026, "season-player"],
  ] as const)("maps a %s overlay avatar to an absolute public URL", async (_scope, seasonYear, playerId) => {
    rpc.mockResolvedValue({ data: [{
      source_id: `${playerId}-pb`, player_id: playerId, display_name: "Paul",
      avatar_url: `/storage/v1/object/public/player-avatars/${playerId}.webp`,
      time_hundredths: 300, achieved_at: "2026-01-01T10:00:00Z",
      achieved_date: "2026-01-01", event_id: null, source_label: "PB",
      source_type: "attempt", previous_best_hundredths: null,
      improvement_hundredths: null, duration_days: 1, is_current: true,
    }], error: null });
    const [series] = await loadPlayerProgressionOverlays([playerId], seasonYear);
    expect(series.points[0].avatarUrl).toBe(`https://example.supabase.co/storage/v1/object/public/player-avatars/${playerId}.webp`);
  });

  it("builds strict event PB improvements and ignores slower, equal and DNF attempts", () => {
    const attempts = [
      ["a1", 350, false], ["a2", 380, false], ["a3", 320, false],
      ["a4", null, true], ["a5", 320, false], ["a6", 290, false],
    ].map(([id, time, dnf], index) => ({ id: String(id), playerId: "paul", name: "Paul", avatarUrl: null, isGuest: false, isAk: false, isDnf: Boolean(dnf), timeHundredths: time as number | null, submittedAt: `2026-01-01T10:0${index}:00Z`, attemptNumber: index + 1 }));
    expect(buildEventPlayerProgressions(attempts, ["paul"])[0].points.map((point) => point.timeHundredths)).toEqual([350, 320, 290]);
  });

  it("keeps the supplied canonical leaderboard order", () => {
    expect(regularPlayerOptions([
      { id: "diamond", name: "Zeta" },
      { id: "gold", name: "Anna" },
      { id: "ak", name: "AK", isAk: true },
    ]).map(({ id }) => id)).toEqual(["diamond", "gold"]);
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
