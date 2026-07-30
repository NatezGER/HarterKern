import type { BadgeTier } from "@/types/pr7Foundation";

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
}

export interface CompactBadge {
  key: string;
  name: string;
  tier: BadgeTier;
  awardedAt: string;
  eventId: string | null;
  description: string;
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

export interface PlayerProfileDetail {
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
  events: PlayerEventSummary[];
  badges: CompactBadge[];
  attemptNumbers: AttemptNumberPoint[];
}
