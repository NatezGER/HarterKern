import type { ProgressionPoint } from "@/types/historyProfiles";

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
