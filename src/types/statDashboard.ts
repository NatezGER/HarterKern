import type { ChaosEvidence, EndspurtEvidence, RivalryEventEvidence } from "./performanceEvidence";

export type StatisticScope = "all-time" | "season" | "special-event";
export type MetricFormat = "time" | "time-gain" | "count" | "percent" | "duration" | "days";
export type MetricGroup = "performance" | "consistency" | "volume" | "event" |
  "bingo" | "rivalry" | "achievements" | "records";
export type CompareBlockKey = "speed" | "consistency" | "volume" | "clutch" |
  "bingo" | "achievements";

export interface FiveWindowEvidence {
  eventId: string;
  eventName: string;
  eventDate: string;
  startAttempt: number;
  endAttempt: number;
  times: number[];
  attemptIds: string[];
  averageHundredths: number;
}

export interface MetricRankEntry {
  windowEvidence?: FiveWindowEvidence;
  endspurtEvidence?: EndspurtEvidence[];
  rivalryEvidence?: RivalryEventEvidence[];
  chaosEvidence?: ChaosEvidence[];

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
  info?: string;
  format: MetricFormat;
  overallFormat?: MetricFormat;
  direction: "asc" | "desc";
  minimumSample: number;
  group: MetricGroup;
  compact?: boolean;
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
  allDirectTakeovers?: number;
  rivalryDirectTakeovers?: number;
  levelReached: boolean;
  commonEvents?: number;
  intensityPercent?: number | null;
  spanDays?: number | null;
  firstRivalryDate?: string | null;
  lastRivalryDate?: string | null;
  balancePercent?: number | null;
}

export interface StatisticDashboard {
  scope: StatisticScope;
  metrics: RankedMetric[];
  rivalryPairs: RivalryPairSummary[];
}

export interface RivalryHubSummary {
  rivalryEvents: number;
  playersWithRivalry: number;
  directTakeovers: number;
  strongestPair: RivalryPairSummary | null;
  longestPair: RivalryPairSummary | null;
}

export interface RivalryHubData {
  summary: RivalryHubSummary;
  pairs: RivalryPairSummary[];
}
