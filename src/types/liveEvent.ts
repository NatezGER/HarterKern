export type LiveEventStatus = "active" | "completed";
export type LiveAttemptResult = "time" | "dns";

export interface LiveParticipant {
  id: string;
  name: string;
  kind: "permanent" | "guest";
  eventId?: string;
  initials: string;
  avatarGradient: string;
  avatarUrl: string | null;
  personalBest: number;
  isAk: boolean;
}

export interface LiveAttempt {
  id: string;
  playerId: string;
  participantKind?: "permanent" | "guest";
  eventId?: string;
  eventName?: string;
  result: LiveAttemptResult;
  timeSeconds?: number;
  date: string;
  submittedAt: string;
  outOfCompetition: boolean;
}

export interface HistoricalAttempt {
  id: string;
  playerId: string | null;
  displayName: string;
  date: string;
  timeSeconds: number;
  historicalLabel?: string;
  isGuest: boolean;
  outOfCompetition: boolean;
  sortOrder: number;
  sourcePriority?: number;
  sourceAttemptId?: string;
}

export interface HistoricalAttemptInput {
  playerId: string | null;
  guestName?: string;
  date: string;
  timeSeconds: number;
  historicalLabel?: string;
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
  historicalAttempts: HistoricalAttempt[];
}

export interface LiveStanding {
  player: LiveParticipant;
  rank: number | null;
  bestTime: number | null;
  attempts: number;
  lastAttempt?: LiveAttempt;
}

export type StartLiveEventParticipant = LiveParticipant & (
  | { kind: "permanent"; source: "existing-player" | "new-player" }
  | { kind: "guest"; source: "new-guest" }
);

export interface StartLiveEventInput {
  name?: string;
  date: string;
  participants: StartLiveEventParticipant[];
}

export interface StartLiveEventResult {
  eventId: string | null;
  error: string | null;
}

export interface AttemptInput {
  playerId: string;
  participantKind?: "permanent" | "guest";
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

export interface BadgeUnlockCelebration {
  key: string;
  name: string;
  tier: "bronze" | "silver" | "gold" | "diamond" | "special";
  requirement: string;
  playerName: string;
}

export interface AttemptMilestone {
  isPersonalBest: boolean;
  isWorldRecord: boolean;
}
