import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { teamMilestones } from "../../src/constants/teamMilestones";
const migration = readFileSync("supabase/migrations/202610080067_team_milestone_content_history.sql","utf8");
const edge = readFileSync("supabase/functions/admin-media/index.ts","utf8");
describe("milestone migration and admin deployment contracts (static, not DB execution)", () => {
  it("keeps full current migration and catalogue in the rollback preflight", () => {
    const script = readFileSync("supabase/tests/read_only/team_milestones_v2_preflight.sql","utf8");
    expect(script).toContain(migration.trim()); expect(script.trim().endsWith("ROLLBACK;")).toBe(true);
    expect(script).toContain(JSON.stringify(teamMilestones.map(({id,kind,threshold})=>({id,kind,threshold}))));
    expect(script).not.toMatch(/insert into public\.(players|attempts|historical_attempts|events)/i);
  });
  it("has only public read policies and service-role mutations", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.team_milestone_content from anon, authenticated");
    expect(migration).toContain("grant select on public.team_milestone_content to anon, authenticated");
    expect(migration).not.toMatch(/for (insert|update|delete|all) to (anon|authenticated)/i);
    expect(edge.indexOf('verifyAdminToken(token, tokenSecret)')).toBeLessThan(edge.indexOf('action === "save-milestone-content"'));
  });
  it("uploads before assigning the image, checks revision and never deletes a referenced upload", () => {
    const action = edge.slice(edge.indexOf('if (action === "save-milestone-content")'),edge.indexOf('if (action === "upload-avatar")'));
    expect(action.indexOf('.upload(imagePath, file')).toBeLessThan(action.indexOf('.update(values)'));
    expect(action).toContain('.eq("updated_at", current.data.updated_at)');
    expect(action).toContain('if (!saved.data?.length)');
    expect(action).not.toContain('.remove(');
  });
  it("keeps placeholders and sequence computation on the read-only server path", () => {
    const rpc = migration.slice(migration.indexOf('create or replace function'));
    expect(rpc).toContain('team_total bigint := 5000'); expect(rpc).toContain('(10-count(*))*500');
    expect(rpc).toContain('order by value::integer, key limit 10');
    expect(rpc).toContain('order by occurred_at, source_priority, source_order, source_id');
    expect(rpc).toContain("r.source_type = 'attempt' and r.event_id is not null");
    expect(rpc).toContain("case when r.source_type = 'attempt' then r.occurred_at else null end");
    expect(rpc).not.toMatch(/insert into|update public|delete from|sync_|get_unified/i);
  });
});
