import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202610110068_guest_event_eligibility.sql", "utf8");
describe("guest event eligibility migration contract", () => {
  it("keeps complete event chronology separate from permanent career projections", () => {
    expect(sql).toContain("create view public.event_eligible_attempts");
    expect(sql).toContain("count(distinct a.participant_id) >= 3");
    expect(sql).toContain("where a.is_valid_time\norder by a.event_id, a.submitted_at, a.attempt_id");
    expect(sql).toContain("time_hundredths < prior_event_best");
    expect(sql).toContain("from public.event_participant_lead_segments_all\nwhere player_id is not null");
    expect(sql).toContain("lag(coalesce(player_id, guest_id))");
    expect(sql).not.toMatch(/create(?: or replace)? (?:view|function) public\.(official_event_attempts|event_pair_|rivalry_pair_|qualified_official_times|season_qualified_official_times)/);
  });
  it("adds guest consumption without allowing guest PBs, and performs no data writes", () => {
    expect(sql).toContain("join public.event_guests g on g.id = a.guest_id");
    expect(sql).toContain("if r.player_id is not null and (old_pb is null or r.time_hundredths < old_pb) then");
    expect(sql).not.toMatch(/\b(insert into|update public|delete from|create trigger)\b/i);
  });
});
