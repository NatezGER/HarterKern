import type { MetricGroup, RankedMetric } from "@/types/statDashboard";

// Shared by the visible badge sections and their performance medal projection.
export function selectRankingGroup(metrics: RankedMetric[], group: MetricGroup) {
  return metrics.filter(metric => metric.group === group);
}
