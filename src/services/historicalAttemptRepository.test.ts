import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ rpc: mocks.rpc }),
}));

import {
  createHistoricalAttempt,
  deleteHistoricalAttempt,
  mapHistoricalAttempt,
  updateHistoricalAttempt,
} from "@/services/historicalAttemptRepository";

const input = {
  playerId: "11000000-0000-0000-0000-000000000002",
  date: "2025-05-31",
  timeSeconds: 2.06,
  historicalLabel: "Archiv",
};

describe("historical attempt repository", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: "historical-id", error: null });
  });

  it("maps a reloaded row without changing identity or classification", () => {
    expect(mapHistoricalAttempt({
      id: "historical-id",
      player_id: input.playerId,
      display_name: "Paul",
      attempt_date: input.date,
      time_hundredths: 206,
      historical_label: "Archiv",
      is_guest: false,
      out_of_competition: false,
      sort_order: 24,
      source: "admin",
      legacy_source_id: "pr6c-source-024",
      deleted_at: null,
      created_at: "2026-07-29T00:00:00Z",
      updated_at: "2026-07-29T00:00:00Z",
    })).toMatchObject({
      id: "historical-id",
      playerId: input.playerId,
      timeSeconds: 2.06,
      isGuest: false,
      sortOrder: 24,
    });
  });

  it("creates, updates and deletes through the dedicated RPCs", async () => {
    await createHistoricalAttempt(input);
    await updateHistoricalAttempt("historical-id", input);
    await deleteHistoricalAttempt("historical-id");
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual([
      "sync_create_historical_attempt",
      "sync_update_historical_attempt",
      "sync_delete_historical_attempt",
    ]);
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
      p_player_id: input.playerId,
      p_time_hundredths: 206,
      p_historical_label: "Archiv",
    });
  });

  it("sends a historical guest without a permanent player id", async () => {
    await createHistoricalAttempt({
      playerId: null,
      guestName: "Jan",
      date: "2026-05-11",
      timeSeconds: 2.07,
      historicalLabel: "Maiwanderung 26",
    });
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
      p_player_id: null,
      p_guest_name: "Jan",
      p_time_hundredths: 207,
    });
  });
});
