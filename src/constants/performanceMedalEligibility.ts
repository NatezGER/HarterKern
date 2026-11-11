import { performanceSections } from "./performanceSections";
import { selectRankingGroup } from "@/lib/statRankingComposition";
import type { RankedMetric } from "@/types/statDashboard";

export const medalThresholdMetricKey = "sub3";
export const performanceMedalEligibility = {
  thresholdKey: medalThresholdMetricKey,
  excludedKeys: [] as readonly string[],
};
export interface MedalEligibility { thresholdKey: string; excludedKeys: readonly string[] }
export function performanceMedalCategories(performance: RankedMetric[], bingo: RankedMetric[], config: MedalEligibility = performanceMedalEligibility) {
  const byKey = new Map(performance.map(metric => [metric.key, metric]));
  const categories = performanceSections.flatMap((section, order) => section.keys.flatMap(key => {
    const metric = byKey.get(key === "thresholds" ? config.thresholdKey : key);
    return metric ? [{ metric, section: section.title, sectionId: `performance-${section.id}`, order, source: "performance" as const }] : [];
  }));
  const last = { section: "IX. BINGO & Most Wanted", sectionId: "performance-bingo", order: performanceSections.length };
  const bingoCategories = selectRankingGroup(bingo, "bingo").map(metric => ({ metric, ...last, source: "bingo" as const }));
  const hunter = byKey.get("most-wanted-firsts");
  const combined = [...categories, ...bingoCategories, ...(hunter ? [{ metric: hunter, ...last, source: "performance" as const }] : [])];
  // A metric key is one category, even if a source accidentally repeats it.
  return [...new Map(combined.map(category => [category.metric.key, { ...category, enabled: !config.excludedKeys.includes(category.metric.key) }])).values()];
}
