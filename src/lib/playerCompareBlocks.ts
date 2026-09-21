import { statisticMetricRegistry } from "@/constants/statMetricRegistry";
import { evaluateCompareWinner } from "@/lib/playerCompare";
import type { CompareBlockKey } from "@/types/statDashboard";
import type { CompareBlockResult, CompareBlockScore, PlayerCompareMetricBundle } from "@/types/playerCompare";

const blockOrder: CompareBlockKey[] = ["speed", "consistency", "volume", "clutch", "bingo", "achievements"];
const blockTitles: Record<CompareBlockKey, string> = {
  speed: "Speed", consistency: "Consistency", volume: "Volume", clutch: "Clutch & Event",
  bingo: "BINGO / Most Wanted", achievements: "Achievements",
};

export function createCompareBlocks(bundle: PlayerCompareMetricBundle, playerAId: string, playerBId: string): CompareBlockResult[] {
  const left = new Map(bundle.players.find(({ playerId }) => playerId === playerAId)?.metrics.map((metric) => [metric.key, metric]) ?? []);
  const right = new Map(bundle.players.find(({ playerId }) => playerId === playerBId)?.metrics.map((metric) => [metric.key, metric]) ?? []);
  return blockOrder.map((block) => {
    const metrics = statisticMetricRegistry.filter(({ compareBlock }) => compareBlock === block).map((definition) => {
      const leftMetric = left.get(definition.key) ?? null;
      const rightMetric = right.get(definition.key) ?? null;
      const winner: "a" | "b" | "tie" = evaluateCompareWinner(
        leftMetric?.value ?? null,
        rightMetric?.value ?? null,
        definition.direction === "asc" ? "lower" : "higher",
      ) ?? "tie";
      return { key: definition.key, label: definition.title, left: leftMetric, right: rightMetric, winner };
    });
    const playerAPoints = metrics.reduce((sum, metric) => sum + (metric.winner === "a" ? 1 : metric.winner === "tie" ? 0.5 : 0), 0);
    const playerBPoints = metrics.reduce((sum, metric) => sum + (metric.winner === "b" ? 1 : metric.winner === "tie" ? 0.5 : 0), 0);
    const winner = playerAPoints === playerBPoints ? "tie" : playerAPoints > playerBPoints ? "a" : "b";
    return { key: block, title: blockTitles[block], metrics, playerAPoints, playerBPoints, winner };
  });
}

export function calculateCompareBlockScore(blocks: CompareBlockResult[]): CompareBlockScore {
  return blocks.reduce<CompareBlockScore>((score, block) => {
    if (block.winner === "a") score.playerA += 1;
    else if (block.winner === "b") score.playerB += 1;
    else { score.playerA += 0.5; score.playerB += 0.5; }
    return score;
  }, { playerA: 0, playerB: 0, totalBlocks: blocks.length });
}
