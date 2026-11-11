import { readFileSync, readdirSync } from "node:fs";
import { expect,it } from "vitest";
const read=(path:string)=>readFileSync(path,"utf8");
it("uses the effective top-ten SQL sources, never UI-truncated five rows",()=>{
 const migrations=readdirSync("supabase/migrations").filter(f=>f.endsWith(".sql")).sort();
 const defining=(name:string)=>migrations.filter(f=>read(`supabase/migrations/${f}`).match(new RegExp(`create (?:or replace )?function public\\.${name}\\(`))).at(-1)!;
 expect(defining("get_statistics_badge_dashboard")).toContain("069_");
 const bingo=read(`supabase/migrations/${defining("get_statistics_badge_dashboard")}`);
 expect(bingo).toContain("rank() over (partition by metric_key order by value desc)");
 expect(bingo).toContain("r.display_position <= 10");
 const performance=read(`supabase/migrations/${defining("get_statistics_performance_dashboard")}`);
 expect(defining("get_statistics_performance_dashboard")).toContain("078_");
 expect(performance.match(/display_position <= 10/g)).toHaveLength(3);
 expect(performance).toContain("display_order<=10");
 const medals=read("src/lib/performanceMedals.ts");
 expect(medals).not.toMatch(/\.slice\(/);
 expect(medals).toContain("entry.rank <= 3");
});
it("moves medals exclusively into the lazy Hall of Fame while preserving BINGO rankings",()=>{
 const page=read("src/pages/StatsPage.tsx");
 expect(page).not.toContain("PerformanceMedalTable");
 expect(page).not.toContain('useDataGroup("players")');
 expect(page).toContain("<BadgeRankingSections"); expect(page).toContain("<PerformanceRankings");
 expect(read("src/pages/LeaderboardPage.tsx")).toContain('useHallOfFameMedals(mode === "medals")');
 expect(read("src/components/stats/PerformanceMedalTable.tsx")).not.toMatch(/getSupabase|setInterval|useEffect|\.rpc\(/);
});
