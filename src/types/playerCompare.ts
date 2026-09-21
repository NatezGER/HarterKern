import type { ProgressionPoint } from "@/types/historyProfiles";
import type { CompareBlockKey } from "@/types/statDashboard";

export interface CompareBundleMetric {
  key: string;
  value: number | null;
  count: number | null;
  total: number | null;
  detail: string | null;
  qualified: boolean;
}

export interface CompareBundlePlayer {
  playerId: string;
  metrics: CompareBundleMetric[];
}

export interface ComparePairContext {
  commonEvents: number;
  decidedEvents: number;
  playerAWins: number;
  playerBWins: number;
  ties: number;
  directTakeovers: number;
  playerATakeovers: number;
  playerBTakeovers: number;
  rivalryEvents: number;
  rivalrySpanDays: number | null;
  intensityPercent: number | null;
  balancePercent: number | null;
  playerANemesisLosses: number;
  playerBNemesisLosses: number;
  playerAFavoriteWins: number;
  playerBFavoriteWins: number;
}

export interface PlayerCompareMetricBundle {
  players: CompareBundlePlayer[];
  pair: ComparePairContext;
}

export interface CompareBlockMetricResult {
  key: string;
  label: string;
  left: CompareBundleMetric | null;
  right: CompareBundleMetric | null;
  scoreable: boolean;
  comparable: boolean;
  winner: "a" | "b" | "tie" | null;
}

export interface CompareBlockResult {
  key: CompareBlockKey;
  title: string;
  metrics: CompareBlockMetricResult[];
  playerAPoints: number;
  playerBPoints: number;
  winner: "a" | "b" | "tie" | null;
  comparable: boolean;
}

export interface CompareBlockScore {
  playerA: number;
  playerB: number;
  comparableBlocks: number;
  totalBlocks: number;
}

export interface PlayerCompareTimelineAttempt {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventEndAt: string;
  playerId: string;
  timeHundredths: number | null;
  isDnf: boolean;
  submittedAt: string;
  attemptNumber: number;
}

export interface CompareAttemptNumberPoint {
  attemptNumber: number;
  samples: number;
  validAttempts: number;
  dnfCount: number;
  averageHundredths: number | null;
}

export interface PlayerCompareSequenceStatistics {
  longestSub3Streak: number;
  longestNoDnfStreak: number;
  fastestFirstAttemptHundredths: number | null;
  attemptNumbers: CompareAttemptNumberPoint[];
}

export interface DirectRivalrySummary {
  playerALeadSeconds: number;
  playerBLeadSeconds: number;
  playerALeadTakes: number;
  playerBLeadTakes: number;
  qualifyingEventCount: number;
}

export interface PlayerCompareSequencePair {
  playerA: PlayerCompareSequenceStatistics;
  playerB: PlayerCompareSequenceStatistics;
  rivalry: DirectRivalrySummary;
}

export interface PlayerCompareProgressionPair {
  playerA: ProgressionPoint[] | null;
  playerB: ProgressionPoint[] | null;
  playerAError: boolean;
  playerBError: boolean;
}

export interface ComparableValue {
  left: number | null;
  right: number | null;
  direction: "higher" | "lower";
}

export interface PlayerMostWantedStatistics {
  allTimeHits: number;
  seasonFirstHits: number | null;
}

export interface PlayerBadgePrestige {
  atLeastBronze: number;
  atLeastSilver: number;
  atLeastGold: number;
  atLeastDiamond: number;
  emerald: number;
}

export type CompareCategoryGroup = "Hauptwerte" | "Head to Head" | "Speed" | "Konstanz" | "Events" | "Most Wanted" | "Badges";

export interface CompareCategoryValue extends ComparableValue {
  key: string;
  label: string;
  group: CompareCategoryGroup;
}

export interface CompareLeadSummary {
  playerALeads: number;
  playerBLeads: number;
  ties: number;
  compared: number;
  unavailable: number;
}

export interface ProgressionCrossover {
  player: "a" | "b";
  pointId: string;
  achievedAt: string;
}
