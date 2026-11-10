import { readFileSync } from "node:fs";
import {expect,it} from "vitest";
it("moves both existing charts before all original overview sections",()=>{
 const overview=readFileSync("src/pages/StatsOverviewPage.tsx","utf8");
 const performance=readFileSync("src/pages/StatsPage.tsx","utf8");
 expect(overview.match(/<WRProgression /g)).toHaveLength(1);expect(overview.match(/<AttemptNumberChart /g)).toHaveLength(1);
 expect(overview.indexOf('<AttemptNumberChart')).toBeLessThan(overview.indexOf('<BeerMilestoneProgress'));
 expect(performance).not.toContain('<WRProgression');expect(performance).not.toContain('<AttemptNumberChart');
 expect(performance).toContain('<MetricDashboardGrid');expect(performance).toContain('<BadgeRankingSections');
 expect(overview).toContain('usePerformanceDashboard(season, version)');
});
