import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({
  from: mocks.from, rpc: mocks.rpc,
  storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: "avatar/" + path } }) }) },
}) }));
import { buildDiscoveryHunters, getMostWantedSnapshot } from "@/services/statsService";
import type { MostWantedSnapshotPayload } from "@/types/pr8";
import { dataGroupCache, getRouteDataPlan, loadDataGroup } from "@/services/dataGroupService";

const ending = {
  ending: 26, ending_label: "26", achieved: true, hit_count: 2,
  participant_count: 2, first_player_id: "p1", first_guest_id: null,
  first_source_id: "first", first_source_order: 3,
  first_display_name: "Hunter", first_avatar_path: null, first_avatar_url: null,
  first_is_guest: false, first_time_hundredths: 326,
  first_occurred_at: "2026-01-01T10:00:00Z", first_occurred_date: "2026-01-01",
  first_has_exact_time: true, first_event_id: "e1", first_source_type: "attempt" as const,
  source_label: "Event",
  additional_hits: [{ source_id: "later", player_id: "p2", guest_id: null,
    display_name: "Anna", avatar_path: null, avatar_url: null, is_guest: false,
    time_hundredths: 426, source_type: "attempt" as const, source_order: 1 }],
};
const progress = { reached_count: 1, total_count: 100, progress_percent: 100,
  open_endings: Array.from({ length: 100 }, (_, i) => i).filter(i => i !== 26),
  most_common_ending: 26, most_common_hit_count: 2,
  rarest_achieved_endings: [26], least_common_hit_count: 2 };
function payload(): MostWantedSnapshotPayload {
  return {
    endings: Array.from({ length: 100 }, (_, i) => i === 26 ? ending : {
      ...ending, ending: i, ending_label: String(i).padStart(2, "0"),
      achieved: false, hit_count: 0, participant_count: 0, first_source_id: null,
      first_source_order: null, first_player_id: null, first_display_name: null,
      first_time_hundredths: null, first_occurred_at: null, first_occurred_date: null,
      first_event_id: null, first_source_type: null, first_has_exact_time: false,
      source_label: null, additional_hits: [],
    }),
    progress,
  };
}

describe("Most Wanted snapshot RPC", () => {
  beforeEach(() => { vi.clearAllMocks(); dataGroupCache.invalidate(); mocks.rpc.mockResolvedValue({ data: payload(), error: null }); });

  it("runs the real MW route loader twice concurrently with one HTTP request", async () => {
    const plan = getRouteDataPlan("/stats/milestones");
    await Promise.all([1, 2].flatMap(() =>
      plan.optional.filter(group => group === "most-wanted").map(group => loadDataGroup(group))));
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_most_wanted_snapshot", { p_season_year: null });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(["all-time" as const, 2026])("loads %s with exactly one RPC and no legacy reads", async season => {
    const result = await getMostWantedSnapshot(season);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_most_wanted_snapshot", {
      p_season_year: season === "all-time" ? null : season,
    });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(result.endings.map(row => row.ending)).toEqual(Array.from({ length: 100 }, (_, i) => i));
    expect(result).toMatchObject({ reached: 1, total: 100, percent: 100,
      openEndings: progress.open_endings, mostCommonEnding: 26, mostCommonHits: 2,
      rarestAchievedEndings: [26] });
    expect(result.endings[26]).toMatchObject({ playerId: "p1", sourceOrder: 3,
      hitCount: 2, participantCount: 2, sourceLabel: "Event" });
  });

  it("preserves display order and credits only first finders, not later hits", async () => {
    const result = await getMostWantedSnapshot();
    expect(result.endings[26].additionalHits.map(hit => hit.playerName)).toEqual(["Anna"]);
    expect(result.endings[26].additionalHits[0]).not.toHaveProperty("occurredAt");
    expect(result.topHunters).toMatchObject([{ playerId: "p1", endingCount: 1 }]);
  });

  it("preserves guest first finders and historical date-only first hits", async () => {
    const data = payload();
    data.endings[26] = { ...ending, first_player_id: null, first_guest_id: "g1",
      first_is_guest: true, first_display_name: "Gast", first_source_type: "historical_attempt",
      first_has_exact_time: false, first_event_id: null, source_label: "Archiv",
      first_avatar_path: "guest.webp" };
    mocks.rpc.mockResolvedValue({ data, error: null });
    const result = await getMostWantedSnapshot();
    expect(result.endings[26]).toMatchObject({ guestId: "g1", isGuest: true,
      hasExactTime: false, sourceType: "historical_attempt", sourceLabel: "Archiv",
      occurredDate: "2026-01-01", avatarUrl: "avatar/guest.webp" });
    expect(result.topHunters[0]).toMatchObject({ id: "guest:g1", endingCount: 1 });
  });

  it("does not reuse an All-Time first finder for a seasonal result", async () => {
    const seasonal = payload();
    seasonal.endings[26] = { ...ending, first_player_id: "season", first_display_name: "Season" };
    mocks.rpc.mockResolvedValueOnce({ data: payload(), error: null })
      .mockResolvedValueOnce({ data: seasonal, error: null });
    expect((await getMostWantedSnapshot()).topHunters[0].playerId).toBe("p1");
    expect((await getMostWantedSnapshot(2026)).topHunters[0].playerId).toBe("season");
  });

  it("propagates errors and rejects a missing payload instead of inventing empty data", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("timeout") })
      .mockResolvedValueOnce({ data: null, error: null });
    await expect(getMostWantedSnapshot()).rejects.toThrow("timeout");
    await expect(getMostWantedSnapshot()).rejects.toThrow("Snapshot fehlt");
  });

  it("builds a deterministic Top 5 and preserves the discovery invariant", () => {
    const rows = [
      ["p1", "Paul"], ["p1", "Paul"], ["p2", "Anna"],
      ["p3", "Berta"], ["p4", "Chris"], ["p5", "Dirk"],
      ["p6", "Emil"],
    ].map(([playerId, name]) => ({ ...ending, first_player_id: playerId,
      first_display_name: name }));
    const hunters = buildDiscoveryHunters(rows);
    expect(hunters.reduce((sum, hunter) => sum + hunter.endingCount, 0)).toBe(rows.length);
    expect(hunters.slice(0, 5).map(({ playerName, endingCount }) =>
      [playerName, endingCount])).toEqual([
      ["Paul", 2], ["Anna", 1], ["Berta", 1], ["Chris", 1], ["Dirk", 1],
    ]);
  });

  it("keeps guest and archived canonical first finders assigned exactly once", () => {
    const hunters = buildDiscoveryHunters([
      { ...ending, first_player_id: null, first_guest_id: "g1",
        first_display_name: "Gast", first_is_guest: true },
      { ...ending, first_player_id: "archived", first_display_name: "Archiv" },
      { ...ending, achieved: false, first_player_id: null, first_display_name: null },
    ]);
    expect(hunters.map(({ id, endingCount }) => [id, endingCount]))
      .toEqual([["archived", 1], ["guest:g1", 1]]);
  });

});
