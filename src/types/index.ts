export type RankTrend = "up" | "down" | "same";
export type BadgeTone = "gold" | "silver" | "bronze" | "beer";

export interface Player {
  id: string;
  name: string;
  initials: string;
  avatarGradient: string;
  personalBest: number;
  average: number;
  attempts: number;
  dailyWins: number;
  trend: RankTrend;
  form: number[];
  badgeIds: string[];
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
  location: string;
  participantIds: string[];
  attempts: number;
  status: "upcoming" | "completed";
}

export interface Statistic {
  id: string;
  label: string;
  value: string;
  change: string;
  icon: "timer" | "users" | "trophy" | "target";
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  tone: BadgeTone;
  icon: "crown" | "flame" | "zap" | "medal";
}
