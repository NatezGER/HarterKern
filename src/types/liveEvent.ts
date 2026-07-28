export type LiveEventStatus = "active" | "completed";
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
  eventId?: string;
  eventName?: string;
  result: LiveAttemptResult;
  timeSeconds?: number;
  date: string;
  submittedAt: string;
  outOfCompetition: boolean;
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
  createdBy: string;
  winnerPlayerId?: string;
  endReason?: "manual" | "automatic";
  seasonId?: string;
}

export interface LiveEventState {
  version: 2;
  players: LiveParticipant[];
  events: LiveEvent[];
  attempts: LiveAttempt[];
}

export interface LiveStanding {
  player: LiveParticipant;
  rank: number | null;
  bestTime: number | null;
  attempts: number;
  lastAttempt?: LiveAttempt;
}

export interface StartLiveEventInput {
  name?: string;
  date: string;
  participants: LiveParticipant[];
}

export interface AttemptInput {
  playerId: string;
  eventId?: string;
  eventName?: string;
  result: LiveAttemptResult;
  timeSeconds?: number;
  date: string;
  outOfCompetition: boolean;
}

export interface AttemptUpdate {
  playerId?: string;
  eventName?: string;
  result?: LiveAttemptResult;
  timeSeconds?: number;
  date?: string;
  outOfCompetition?: boolean;
}

export interface RecordCelebration {
  kind: "pb" | "wr";
  playerName: string;
  time: number;
  previousTime?: number;
}

export interface AttemptMilestone {
  isPersonalBest: boolean;
  isWorldRecord: boolean;
}
