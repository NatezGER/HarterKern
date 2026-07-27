export type RankTrend = "up" | "down" | "same";
export type AttemptStatus = "pending" | "approved" | "rejected";
export type AttemptSource = "public" | "admin";

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
  playerId: string;
  time: number;
  attempts: number;
}

export interface WorldRecord {
  id: string;
  playerId: string;
  time: number;
  date: string;
  location: string;
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
  status: "active" | "closed";
}

export interface Attempt {
  id: string;
  playerId: string;
  eventId: string;
  status: AttemptStatus;
  timeHundredths: number | null;
  isDnf: boolean;
  submittedAt: string;
  editedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  deletedAt: string | null;
  source: AttemptSource;
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
}

export interface PublicAttemptInput {
  playerId?: string;
  playerName?: string;
  timeHundredths: number | null;
  isDnf: boolean;
  clientIdentifier: string;
}
