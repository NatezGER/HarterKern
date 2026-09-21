import { statisticMetricRegistry } from "@/constants/statMetricRegistry";
import type { CompareBlockKey } from "@/types/statDashboard";
import type { CompareBlockResult, CompareBlockScore, PlayerCompareMetricBundle } from "@/types/playerCompare";

const blockOrder: CompareBlockKey[] = ["speed", "consistency", "volume", "clutch", "rivalry", "bingo", "achievements"];
const blockTitles: Record<CompareBlockKey, string> = {
  speed: "Speed", consistency: "Consistency", volume: "Volume", clutch: "Clutch & Event",
  rivalry: "Head-to-Head / Rivalry", bingo: "BINGO / Most Wanted", achievements: "Achievements",
};

export function createCompareBlocks(bundle: PlayerCompareMetricBundle, playerAId: string, playerBId: string): CompareBlockResult[] {
  const left = new Map(bundle.players.find(({ playerId }) => playerId === playerAId)?.metrics.map((metric) => [metric.key, metric]) ?? []);
  const right = new Map(bundle.players.find(({ playerId }) => playerId === playerBId)?.metrics.map((metric) => [metric.key, metric]) ?? []);
  return blockOrder.map((block) => {
    const metrics = statisticMetricRegistry.filter(({ compareBlock }) => compareBlock === block).map((definition) => {
      const leftMetric = left.get(definition.key) ?? null;
      const rightMetric = right.get(definition.key) ?? null;
      const scoreable = definition.scoreable === true;
      const compareMinimum = definition.compareMinimumSample;
      const leftSample = leftMetric?.total ?? leftMetric?.count ?? 0;
      const rightSample = rightMetric?.total ?? rightMetric?.count ?? 0;
      const comparable = scoreable && leftMetric?.qualified === true && rightMetric?.qualified === true
        && leftMetric.value != null && rightMetric.value != null
        && (compareMinimum == null || (leftSample >= compareMinimum && rightSample >= compareMinimum));
      let winner: "a" | "b" | "tie" | null = null;
      if (comparable) {
        if (leftMetric!.value === rightMetric!.value) winner = "tie";
        else if ((definition.direction === "asc" && leftMetric!.value! < rightMetric!.value!) || (definition.direction === "desc" && leftMetric!.value! > rightMetric!.value!)) winner = "a";
        else winner = "b";
      }
      return { key: definition.key, label: definition.title, left: leftMetric, right: rightMetric, scoreable, comparable, winner };
    });
    const playerAPoints = metrics.reduce((sum, metric) => sum + (metric.winner === "a" ? 1 : metric.winner === "tie" ? 0.5 : 0), 0);
    const playerBPoints = metrics.reduce((sum, metric) => sum + (metric.winner === "b" ? 1 : metric.winner === "tie" ? 0.5 : 0), 0);
    const comparable = metrics.some((metric) => metric.comparable);
    const winner = !comparable ? null : playerAPoints === playerBPoints ? "tie" : playerAPoints > playerBPoints ? "a" : "b";
    return { key: block, title: blockTitles[block], metrics, playerAPoints, playerBPoints, winner, comparable };
  });
}

export function calculateCompareBlockScore(blocks: CompareBlockResult[]): CompareBlockScore {
  return blocks.reduce<CompareBlockScore>((score, block) => {
    if (!block.comparable) return score;
    score.comparableBlocks += 1;
    if (block.winner === "a") score.playerA += 1;
    else if (block.winner === "b") score.playerB += 1;
    else { score.playerA += 0.5; score.playerB += 0.5; }
    return score;
  }, { playerA: 0, playerB: 0, comparableBlocks: 0, totalBlocks: blocks.length });
}
