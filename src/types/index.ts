export type RankTrend = "up" | "down" | "same";

export interface Player {
  id: string;
  name: string;
  initials: string;
  avatarGradient: string;
  avatarUrl: string | null;
  personalBest: number;
  average: number;
  attempts: number;
  validAttempts: number;
  dnfCount: number;
  dailyWins: number;
  trend: RankTrend;
  isAk: boolean;
  isArchived: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  rank: number;
  previousRank: number;
  recordDate: string;
}

export interface DailyWinner {
  id: string;
  date: string;
  playerId: string | null;
  participantName: string;
  isGuest: boolean;
  time: number;
  attempts: number;
}

export interface WorldRecord {
  id: string;
  playerId: string;
  time: number;
  date: string;
  achievedAt: string;
  location: string;
  eventId: string | null;
  sourceType: "attempt" | "historical_attempt";
  previousTime: number | null;
  improvementHundredths: number | null;
  durationDays: number;
  isCurrent: boolean;
}

export interface PrestigeActivity {
  id: string;
  type: "world_record" | "personal_best" | "badge" | "group_milestone" | "most_wanted_first";
  occurredAt: string;
  playerId: string | null;
  playerName: string | null;
  avatarUrl: string | null;
  eventId: string | null;
  eventName: string | null;
  title: string;
  description: string;
  timeHundredths: number | null;
  badgeKey: string | null;
  tier: "bronze" | "silver" | "gold" | "diamond" | "special" | null;
  priority: number;
}

export interface GroupMilestone {
  key: string;
  threshold: number;
  name: string;
  description: string;
  currentCount: number;
  achieved: boolean;
  achievedAt: string | null;
  playerId: string | null;
  playerName: string | null;
  eventId: string | null;
  eventName: string | null;
}

export interface BadgeRarity {
  key: string;
  name: string;
  tier: "bronze" | "silver" | "gold" | "diamond" | "special";
  recipients: number;
  playerCount: number;
  percent: number | null;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  startedAt: string;
  endsAt: string;
  participantIds: string[];
  attempts: number;
  validAttempts: number;
  dnfCount: number;
  fastest: number;
  average: number;
  winnerNames: string[];
  podium?: Array<{
    id: string;
    playerId?: string | null;
    isGuest?: boolean;
    name: string;
    avatarUrl: string | null;
    rank: number;
    time: number;
  }>;
  status: "active" | "closed";
  awardsTrophies: boolean;
}

export interface MostWantedEnding {
  ending: number;
  label: string;
  achieved: boolean;
  hitCount: number;
  participantCount: number;
  playerId: string | null;
  guestId: string | null;
  playerName: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
  timeHundredths: number | null;
  occurredAt: string | null;
  occurredDate: string | null;
  hasExactTime: boolean;
  eventId: string | null;
  sourceType: "attempt" | "historical_attempt" | null;
  sourceLabel: string | null;
}

export interface MostWantedSnapshot {
  endings: MostWantedEnding[];
  reached: number;
  total: number;
  percent: number;
  openEndings: number[];
  mostCommonEnding: number | null;
  mostCommonHits: number;
  rarestAchievedEndings: number[];
}

export interface TimeThresholdStatistic {
  seconds: number;
  count: number;
  total: number;
  percent: number;
}

export interface LeagueTimeStatistics {
  totalValidTimes: number;
  mostCommonTimeHundredths: number | null;
  mostCommonTimeHits: number;
  mostCommonTimeParticipants: number;
  smoothTimeCount: number;
  mostCommonSmoothHundredths: number | null;
  mostCommonSmoothHits: number;
  topSmoothPlayerId: string | null;
  topSmoothPlayerName: string | null;
  topSmoothPlayerAvatarUrl: string | null;
  topSmoothPlayerHits: number;
  latestSmoothPlayerName: string | null;
  latestSmoothHundredths: number | null;
  latestSmoothAt: string | null;
  latestSmoothDate: string | null;
  latestSmoothHasExactTime: boolean;
  thresholds: TimeThresholdStatistic[];
}

export interface Attempt {
  id: string;
  playerId: string | null;
  guestId?: string | null;
  eventId: string | null;
  timeHundredths: number | null;
  isDnf: boolean;
  submittedAt: string;
}

export interface Statistic {
  id: string;
  label: string;
  value: string;
  change: string;
  icon: "timer" | "users" | "trophy" | "target";
}

export interface PublicDataSnapshot {
  players: Player[];
  leaderboard: LeaderboardEntry[];
  dailyWinners: DailyWinner[];
  worldRecordHistory: WorldRecord[];
  events: Event[];
  statistics: Statistic[];
  recentAttempts: Attempt[];
  activities: PrestigeActivity[];
  milestones: GroupMilestone[];
  badgeRarity: BadgeRarity[];
  mostWanted: MostWantedSnapshot;
  leagueTimeStatistics: LeagueTimeStatistics;
}
