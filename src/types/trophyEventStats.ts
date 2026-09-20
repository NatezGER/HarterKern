import type { MostWantedSnapshot } from "@/types";
import type { StatisticDashboard } from "@/types/statDashboard";

export interface TrophyEventSpecialMetrics {
  bingoLines: number;
  distinctEndings: number;
  snapEndings: number;
  matchingTimeParticipantCount: number;
  matchingTimeHundredths: number | null;
  matchingTimeParticipantNames: string[];
  validAttempts: number;
  mostCommonEnding: number | null;
  mostCommonEndingHits: number;
}

export interface TrophyEventSpecialStats {
  eventId: string;
  eventName: string;
  mostWanted: MostWantedSnapshot;
  metrics: TrophyEventSpecialMetrics;
  dashboard?: StatisticDashboard | null;
}

export interface TrophyEventMilestoneStage {
  id: string;
  threshold: number;
  current: number;
  achieved: boolean;
}

export interface TrophyEventMilestoneFamily {
  id: "bingo" | "most-wanted" | "snap-endings" | "matching-time" |
    "attempts" | "common-ending";
  name: string;
  current: number;
  maximum: number;
  stages: TrophyEventMilestoneStage[];
  detail: string | null;
}
