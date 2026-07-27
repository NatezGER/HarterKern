export type LiveRole = "admin" | "user";
export type LiveEventStatus = "active" | "completed";
export type LiveAttemptStatus = "pending" | "approved" | "rejected";
export type LiveAttemptResult = "time" | "dns";

export interface LiveParticipant {
  id: string;
  name: string;
  initials: string;
  avatarGradient: string;
  avatarUrl: string | null;
  personalBest: number;
  isAk: boolean;
}

export interface LiveAttempt {
  id: string;
  playerId: string;
  eventId: string;
  result: LiveAttemptResult;
  timeSeconds?: number;
  status?: LiveAttemptStatus;
  submittedAt: string;
  submittedBy: string;
  submittedByRole: LiveRole;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  outOfCompetition?: boolean;
}

export interface LiveEvent {
  id: string;
  name?: string;
  date: string;
  startedAt: string;
  endsAt: string;
  endedAt?: string;
  status: LiveEventStatus;
  participantIds: string[];
  participants: LiveParticipant[];
  createdBy: string;
  winnerPlayerId?: string;
  endReason?: "manual" | "automatic";
}

export interface LiveEventState {
  version: 1;
  role: LiveRole;
  events: LiveEvent[];
  attempts: LiveAttempt[];
}

export interface LiveStanding {
  player: LiveParticipant;
  rank: number | null;
  bestTime: number | null;
  approvedBest: number | null;
  pendingBest: number | null;
  attempts: number;
  lastAttempt?: LiveAttempt;
}

export interface StartLiveEventInput {
  name?: string;
  date: string;
  participants: LiveParticipant[];
}

export interface RecordCelebration {
  kind: "pb" | "wr";
  playerName: string;
  time: number;
  previousTime?: number;
}
