export type StatisticScope = "all-time" | "season" | "special-event";
export type MetricFormat = "time" | "count" | "percent" | "duration";

export interface MetricRankEntry {
  rank: number;
  playerId: string;
  name: string;
  avatarUrl: string | null;
  value: number;
  count: number | null;
  total: number | null;
  detail: string | null;
}

export interface RankedMetric {
  key: string;
  title: string;
  description: string;
  format: MetricFormat;
  overallFormat?: MetricFormat;
  direction: "asc" | "desc";
  minimumSample: number;
  overallValue: number | null;
  overallCount: number | null;
  overallTotal: number | null;
  overallDetail: string | null;
  rankings: MetricRankEntry[];
}

export interface RivalryPairSummary {
  playerLowId: string;
  playerHighId: string;
  playerLowName: string;
  playerHighName: string;
  rivalryEvents: number;
  directTakeovers: number;
  levelReached: boolean;
}

export interface StatisticDashboard {
  scope: StatisticScope;
  metrics: RankedMetric[];
  rivalryPairs: RivalryPairSummary[];
}
