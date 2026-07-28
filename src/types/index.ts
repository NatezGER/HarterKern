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
}
