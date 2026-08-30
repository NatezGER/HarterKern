import { describe, expect, it, vi } from "vitest";

const rpc = vi.fn().mockResolvedValue({ data: [{ rival_player_id: "b", display_name: "Lars", avatar_url: null, avatar_path: "b.webp", rivalry_events: 3, direct_takeovers: 7, first_rivalry_date: "2026-01-01", last_rivalry_date: "2026-08-01" }], error: null });
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc, storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "https://example.test/b.webp" } }) }) } }) }));
import { loadPlayerRivalries } from "@/services/playerRivalryService";

describe("loadPlayerRivalries", () => {
  it("maps the player-scoped ordered rivalry summary", async () => {
    await expect(loadPlayerRivalries("a")).resolves.toEqual([expect.objectContaining({ rivalPlayerId: "b", rivalName: "Lars", rivalryEvents: 3, directTakeovers: 7 })]);
    expect(rpc).toHaveBeenCalledWith("get_player_rivalries", { p_player_id: "a" });
  });
});
