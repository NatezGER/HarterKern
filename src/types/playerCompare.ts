import type {
  CompactBadge,
  PlayerProfilePrestige,
  PlayerProfileProgression,
} from "@/types/historyProfiles";

export interface PlayerCompareAttemptRead {
  id: string;
  eventId: string;
  timeHundredths: number | null;
  isDnf: boolean;
  submittedAt: string;
  attemptNumber: number;
  isPersonalBest: boolean;
}

export interface PlayerCompareAttempt extends PlayerCompareAttemptRead {
  eventDate: string;
}

export interface CompareStreakSummary {
  longest: number;
  current: number;
}

export interface CompareAttemptNumberPoint {
  attemptNumber: number;
  samples: number;
  validAttempts: number;
  dnfCount: number;
  averageHundredths: number | null;
}

export interface PlayerConsistencyStatistics {
  medianHundredths: number | null;
  standardDeviationHundredths: number | null;
  rangeHundredths: number | null;
  fastestThreeAverageHundredths: number | null;
  fastestFiveAverageHundredths: number | null;
  pbToAverageHundredths: number | null;
  pbToMedianHundredths: number | null;
  sub3: CompareStreakSummary;
  sub4: CompareStreakSummary;
  noDnf: CompareStreakSummary;
}

export interface PlayerEventDominanceStatistics {
  fastestFirstAttemptHundredths: number | null;
  bestEventAverageHundredths: number | null;
  eventsWithSub3: number;
  eventsWithoutDnf: number;
  perfectSub3Events: number;
  eventsWithAttempts: number;
}

export interface PlayerStatMadness {
  modalTimeHundredths: number | null;
  modalTimeHits: number;
  exactRepeatCount: number;
  withinQuarterSecondOfPbPercent: number | null;
  withinHalfSecondOfPbPercent: number | null;
  distinctSub3Times: number;
  mostCommonHundredth: number | null;
  mostCommonHundredthHits: number;
}

export interface PlayerDeepStatistics {
  consistency: PlayerConsistencyStatistics;
  eventDominance: PlayerEventDominanceStatistics;
  attemptNumbers: CompareAttemptNumberPoint[];
  madness: PlayerStatMadness;
}

export interface PlayerDeepCompareData {
  statistics: PlayerDeepStatistics;
  progression: PlayerProfileProgression;
  badges: CompactBadge[];
  prestige: PlayerProfilePrestige;
}

export interface PlayerDeepComparePair {
  playerA: PlayerDeepCompareData | null;
  playerB: PlayerDeepCompareData | null;
}

export interface BadgeComparison {
  onlyA: CompactBadge[];
  shared: Array<{ playerA: CompactBadge; playerB: CompactBadge }>;
  onlyB: CompactBadge[];
}

export interface ComparableValue {
  left: number | null;
  right: number | null;
  direction: "higher" | "lower";
}

export interface CompareLeadSummary {
  playerALeads: number;
  playerBLeads: number;
  ties: number;
  compared: number;
}
