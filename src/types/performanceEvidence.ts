export interface PerformanceEventReference {
  eventId: string;
  eventName: string;
  eventDate: string;
}

export interface EndspurtEvidence extends PerformanceEventReference {
  attemptCount: number;
  beforePb: number;
  finalPb: number;
  gain: number;
  lastQuarter: { attemptId: string; attemptNumber: number; timeHundredths: number | null; isDnf: boolean }[];
}

export interface RivalryEventEvidence extends PerformanceEventReference {
  opponents: { playerId: string; name: string; takeovers: number }[];
}

export interface ChaosEvidence extends PerformanceEventReference {
  attemptId: string;
  submittedAt: string;
  attemptNumber: number;
  beforePb: number;
  newPb: number;
  takeovers: number;
  opponents: { playerId: string; name: string; bestHundredths: number }[];
}
