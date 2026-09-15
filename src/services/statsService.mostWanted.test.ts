import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ from: mocks.from }) }));

import { buildDiscoveryHunters, getMostWantedSnapshot } from "@/services/statsService";

const ending = {
  ending: 26, ending_label: "26", achieved: true, hit_count: 1,
  participant_count: 1, first_player_id: "p1", first_guest_id: null,
  first_display_name: "Hunter", first_avatar_path: null, first_avatar_url: null,
  first_is_guest: false, first_time_hundredths: 326,
  first_occurred_at: "2026-01-01T10:00:00Z", first_occurred_date: "2026-01-01",
  first_has_exact_time: true, first_event_id: "e1", first_source_type: "attempt",
  source_label: "Event",
};
const progress = { reached_count: 1, total_count: 100, progress_percent: 1,
  open_endings: [0], most_common_ending: 26, most_common_hit_count: 1,
  rarest_achieved_endings: [26] };
const hits = [
  { source_id: "h1", player_id: "p1", guest_id: null, display_name: "Hunter",
    avatar_url: null, avatar_path: null, is_guest: false, time_hundredths: 326,
    occurred_at: "2026-01-01T10:00:00Z", occurred_date: "2026-01-01",
    has_exact_time: true, source_priority: 2, source_order: 1 },
  { source_id: "h2", player_id: "p2", guest_id: null, display_name: "Anna",
    avatar_url: null, avatar_path: null, is_guest: false, time_hundredths: 426,
    occurred_at: "2026-01-02T10:00:00Z", occurred_date: "2026-01-02",
    has_exact_time: true, source_priority: 2, source_order: 1 },
  { source_id: "h3", player_id: "p2", guest_id: null, display_name: "Anna",
    avatar_url: null, avatar_path: null, is_guest: false, time_hundredths: 427,
    occurred_at: "2026-01-03T10:00:00Z", occurred_date: "2026-01-03",
    has_exact_time: true, source_priority: 2, source_order: 1 },
];

function builder(data: unknown) {
  const response = { data, error: null };
  const value = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), single: vi.fn(),
    then: (resolve: (result: typeof response) => unknown) => Promise.resolve(response).then(resolve) };
  value.select.mockReturnValue(value); value.eq.mockReturnValue(value);
  value.order.mockReturnValue(value); value.single.mockReturnValue(value);
  return value;
}

describe("seasonal Most Wanted service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) => builder(
      table.includes("progress") ? progress : table.includes("qualified_official_times") ? hits : [ending],
    ));
  });

  it("keeps the existing All-Time views as the default", async () => {
    await getMostWantedSnapshot();
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "most_wanted_endings", "most_wanted_progress", "qualified_official_times",
    ]);
  });

  it("uses only season-scoped views for a selected year", async () => {
    await expect(getMostWantedSnapshot(2026)).resolves.toMatchObject({ reached: 1 });
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "season_most_wanted_endings", "season_most_wanted_progress",
      "season_qualified_official_times",
    ]);
  });

  it("adds later hits but counts only the canonical first finder as a discovery", async () => {
    const result = await getMostWantedSnapshot();
    expect(result.endings[0].additionalHits.map(({ playerName }) => playerName)).toEqual(["Anna"]);
    expect(result.topHunters.map(({ playerName, endingCount }) => [playerName, endingCount]))
      .toEqual([["Hunter", 1]]);
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

  it("uses each scope's canonical first-finder rows", async () => {
    const eternal = { ...ending, first_player_id: "eternal", first_display_name: "Eternal" };
    const seasonal = { ...ending, first_player_id: "season", first_display_name: "Season" };
    mocks.from.mockImplementation((table: string) => builder(
      table.includes("progress") ? progress
        : table.includes("qualified_official_times") ? hits
          : table.startsWith("season_") ? [seasonal] : [eternal],
    ));
    await expect(getMostWantedSnapshot()).resolves.toMatchObject({
      topHunters: [{ playerId: "eternal", endingCount: 1 }],
    });
    await expect(getMostWantedSnapshot(2026)).resolves.toMatchObject({
      topHunters: [{ playerId: "season", endingCount: 1 }],
    });
  });
});
