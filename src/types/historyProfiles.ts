import type { BadgeTier } from "@/types/pr7Foundation";
import type { BingoTier, TrophyTier } from "@/types/pr8";

export interface MediaPhoto {
  id: string;
  path: string;
  url: string;
  caption: string | null;
}

export interface EventAttemptDetail {
  id: string;
  playerId: string | null;
  guestId: string | null;
  name: string;
  avatarUrl: string | null;
  isGuest: boolean;
  isAk: boolean;
  timeHundredths: number | null;
  isDnf: boolean;
  submittedAt: string;
  attemptNumber: number;
  rank: number | null;
  isPb: boolean;
  isWr: boolean;
  isEb: boolean;
}

export interface EventParticipantDetail {
  playerId: string | null;
  guestId: string | null;
  name: string;
  avatarUrl: string | null;
  isGuest: boolean;
  isAk: boolean;
  attempts: number;
  validAttempts: number;
  dnfCount: number;
  bestHundredths: number | null;
  averageHundredths: number | null;
  rank: number | null;
  leadSeconds: number;
  eventBestBreaks: number;
}

export interface CompactBadge {
  key: string;
  playerId: string;
  playerName: string;
  playerAvatarUrl: string | null;
  name: string;
  tier: BadgeTier;
  awardedAt: string;
  eventId: string | null;
  description: string;
  badgeKey: string;
  category: string;
  familyKey: string | null;
  requirement: string;
  threshold: number | null;
  recipientCount: number;
  regularPlayerCount: number;
  rarityPercent: number | null;
  sourceAttemptId: string | null;
  sourceHistoricalAttemptId: string | null;
  eventName: string | null;
  sourceAttemptNumber: number | null;
  sourceTimeHundredths: number | null;
  nextBadgeName: string | null;
  nextRequirement: string | null;
  nextTier: BadgeTier | null;
  nextThreshold: number | null;
  currentProgress: number | null;
  isSpecialEventBadge: boolean;
  badgeKind: "tiered" | "single";
  designVariant: "standard" | "positive_special" | "consolation";
  scopeType: "all_time" | "season" | "event";
  bingoLineCounts: { bronze: number; silver: number; gold: number } | null;
}

export interface TrophyAward {
  key: string;
  competitionType: "event" | "season" | "historical";
  scopeType: "all_time" | "season" | "event";
  competitionId: string;
  seasonKey: string | null;
  competitionName: string;
  year: number;
  eventDate: string;
  placement: 1 | 2 | 3;
  tier: TrophyTier;
  playerId: string | null;
  guestId: string | null;
  playerName: string;
  awardedAt: string;
}

export interface ProgressionPoint {
  id: string;
  timeHundredths: number;
  achievedAt: string;
  achievedDate: string;
  eventId: string | null;
  sourceLabel: string;
  sourceType: "attempt" | "historical_attempt";
  previousHundredths: number | null;
  improvementHundredths: number | null;
  durationDays: number;
  isCurrent: boolean;
}

export interface EventAttemptNumberPoint {
  attemptNumber: number;
  samples: number;
  averageHundredths: number;
  bestHundredths: number;
  slowestHundredths: number;
}

export interface EventDetail {
  id: string;
  name: string;
  date: string;
  startedAt: string;
  closedAt: string | null;
  status: "active" | "closed";
  description: string | null;
  isImportant: boolean;
  awardsTrophies: boolean;
  participants: number;
  validAttempts: number;
  dnfCount: number;
  fastestHundredths: number | null;
  averageHundredths: number | null;
  podium: EventParticipantDetail[];
  participantStats: EventParticipantDetail[];
  attempts: EventAttemptDetail[];
  badges: CompactBadge[];
  photos: MediaPhoto[];
  attemptNumbers: EventAttemptNumberPoint[];
  trophies: TrophyAward[];
  extras?: {
    loading: boolean;
    errors: Partial<Record<"badges" | "trophies", string>>;
  };
}

export interface PlayerEventSummary {
  eventId: string;
  eventName: string;
  eventDate: string;
  bestHundredths: number | null;
  rank: number | null;
  attempts: number;
  validAttempts: number;
  dnfCount: number;
}

export interface AttemptNumberPoint {
  attemptNumber: number;
  samples: number;
  validAttempts: number;
  dnfCount: number;
  averageHundredths: number | null;
}

export interface BingoHit {
  id: string;
  sourceType: "attempt" | "historical_attempt";
  eventId: string | null;
  timeHundredths: number;
  occurredAt: string;
  occurredDate: string;
  hasExactTime: boolean;
  sourceLabel: string;
}

export interface BingoField {
  ending: number;
  label: string;
  hitCount: number;
  tier: BingoTier;
  hits: BingoHit[];
}

export interface BingoSummary {
  collectedEndings: number;
  bronzeFields: number;
  silverFields: number;
  goldFields: number;
  bronzeLines: number;
  silverLines: number;
  goldLines: number;
  highestBadgeTier: Exclude<BingoTier, "open"> | null;
}

export interface PlayerBingo {
  fields: BingoField[];
  summary: BingoSummary;
}

export interface PlayerProfileCore {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarPath: string | null;
  isAk: boolean;
  personalBestHundredths: number | null;
  rank: number | null;
  averageHundredths: number | null;
  eventParticipations: number;
  wins: number;
  secondPlaces: number;
  thirdPlaces: number;
  validAttempts: number;
  dnfCount: number;
  eventLeadSeconds: number;
  eventBestBreaks: number;
}

export interface PlayerSeasonProfile {
  personalBestHundredths: number | null;
  rank: number | null;
  averageHundredths: number | null;
  eventParticipations: number;
  wins: number;
  secondPlaces: number;
  thirdPlaces: number;
  validAttempts: number;
  dnfCount: number;
  eventLeadSeconds: number;
  eventBestBreaks: number;
}

export interface TimeThresholdSummary {
  seconds: 5 | 4 | 3;
  count: number;
  total: number;
  percent: number;
}

export interface PlayerTimePerformance {
  thresholds: TimeThresholdSummary[];
}

export interface PlayerProfilePrestige {
  pbCount: number;
  largestPbImprovementHundredths: number | null;
  averagePbImprovementHundredths: number | null;
  worldRecordCount: number;
  worldRecordDays: number;
  longestWorldRecordDays: number;
  visibleBadgeCount: number;
}

export interface ProfileWorldRecord {
  id: string;
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  timeHundredths: number;
  achievedAt: string;
  achievedDate: string;
  eventId: string | null;
  sourceLabel: string;
  sourceType: "attempt" | "historical_attempt";
  improvementHundredths: number | null;
  durationDays: number;
  isCurrent: boolean;
  sequenceNumber?: number;
}

export interface PlayerProfileProgression {
  personal: ProgressionPoint[];
  worldRecords: ProfileWorldRecord[];
}
