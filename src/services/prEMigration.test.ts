import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const read=(path:string)=>readFileSync(path,"utf8").replace(/\r\n/g,"\n");
const old=read("supabase/migrations/202611090075_player_beer_and_live_selection.sql");
const sql=read("supabase/migrations/202611110079_pr_e_assets_and_beer.sql");
it("preserves the canonical eligible source, signature and legacy top three",()=>{
 const eligible=(s:string)=>s.split("with eligible as materialized (")[1].split("),")[0];
 expect(eligible(sql)).toBe(eligible(old));
 const ranked=(s:string)=>s.split("ranked as (")[1].split("\nselect jsonb_build_object")[0];
 expect(ranked(sql)).toBe(ranked(old));
 expect(sql).toContain('create or replace function public.get_player_beer_profile(p_player_id uuid, p_season_year integer default null)');
 expect(sql).toContain('security invoker');expect(sql).toContain('max(time_hundredths) worst');expect(sql).toContain('avg(time_hundredths) average');
});
it("does not rewrite rows, policies or permissions and keeps legacy constraint variants",()=>{
 expect(sql).not.toMatch(/\b(update|delete from|insert into|drop policy|create policy) public\./i);
 expect(sql).not.toContain('grant insert');expect(sql).toContain('trophy:historical:(first-sub-3|first-sub-2|first-bingo-card)');
 expect(sql).toContain('record:(wr|sr|pb|eb)');expect(sql).toContain('award_assets_storage_owner_check');
});
it("keeps admin authorization before client creation, scoped deletion and failed-upload cleanup",()=>{
 const edge=read('supabase/functions/admin-media/index.ts');
 expect(edge.indexOf('await verifyAdminToken')).toBeLessThan(edge.indexOf('const supabase = createClient'));
 expect(edge).toContain('if (current.data) requireAwardStoragePath(assetId, current.data.storage_path)');
 expect(edge).toContain('requireAwardStoragePath(assetId, current.data.storage_path);\n      const deleted');
 expect(edge).toContain('if (saved.error) {\n        await supabase.storage.from("award-assets").remove([path])');
});
