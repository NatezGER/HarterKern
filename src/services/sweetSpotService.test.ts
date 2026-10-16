import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ rpc }) }));
import { getEventSweetSpots } from "./sweetSpotService";
beforeEach(() => rpc.mockReset());
describe("batched optional Sweet Spot read", () => {
  it("maps all participants in one request, retaining single-sample spots", async () => {
    rpc.mockResolvedValue({ error: null, data: ["p","q"].map(player_id => ({
      player_id, attempt_number: 5, average_hundredths: 236, sample_count: 1, next_attempt_number: 5,
    })) });
    const values = await getEventSweetSpots("event");
    expect(rpc.mock.calls).toEqual([["get_event_sweet_spots", { p_event_id: "event" }]]);
    expect(values.size).toBe(2);
    expect(values.get("p")).toEqual({ attemptNumber: 5, averageHundredths: 236, samples: 1, nextAttemptNumber: 5 });
  });
  it("does not request an inactive event and propagates errors to the optional hook", async () => {
    expect((await getEventSweetSpots("")).size).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(getEventSweetSpots("event")).rejects.toThrow("unavailable");
  });
  it("projects the exact chart RPC without a second average engine or minimum sample rule (static SQL contract)", () => {
    const sql = readFileSync("supabase/migrations/202610160070_live_sweet_spot.sql", "utf8");
    expect(sql).toContain("public.get_player_attempt_number_statistics(p.player_id)");
    expect(sql).toContain("where s.average_hundredths is not null");
    expect(sql).toContain("order by s.average_hundredths, s.attempt_number");
    expect(sql).toContain("public.official_event_attempts");
    expect(sql).toContain("where a.event_id = p_event_id");
    expect(sql).toContain("e.status = 'active' and e.deleted_at is null");
    expect(sql).toContain("not p.is_ak and not p.is_archived");
    expect(sql).not.toMatch(/avg\(|having|valid_attempts\s*[>=]|insert into|update public|create trigger/i);
    const card = readFileSync("src/components/events/ParticipantCard.tsx", "utf8");
    expect(card).not.toMatch(/\.rpc\(|useSweetSpots|useEffect/);
    const page = readFileSync("src/pages/LiveEventPage.tsx", "utf8");
    expect(page.match(/useSweetSpots\(/g)).toHaveLength(1);
    const save = readFileSync("src/hooks/useLiveEvent.tsx", "utf8");
    expect(save).not.toMatch(/SweetSpot|sweetSpot/);
    const repository = readFileSync("src/services/dataPlatformRepository.ts", "utf8");
    expect(repository).toContain('.eq("status", "approved")');
    expect(repository).toContain('.is("deleted_at", null)');
    expect(repository).toContain('.eq("is_archived", false)');
  });
});
