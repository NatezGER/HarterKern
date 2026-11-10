export interface DevelopmentSource {
  id: string; date: string; time: number; source: string; exact: boolean; eventId: string | null;
}
export type DevelopmentEvidence =
  | { kind: "spiral"; eventId: string; eventName: string; eventDate: string; start: number; end: number; length: number; attempts: { id: string; number: number; time: number }[] }
  | { kind: "trend"; olderMedian: number; newerMedian: number; samples: number; older: DevelopmentSource[]; newer: DevelopmentSource[] }
  | { kind: "hunt"; before: DevelopmentSource; after: DevelopmentSource; length: number; intermediate: number }
  | { kind: "plateau"; pb: DevelopmentSource; first: DevelopmentSource; last: DevelopmentSource; length: number; season: number | null }
  | { kind: "near"; total: number; limit: number; hits: (DevelopmentSource & { priorPb: number; gap: number })[] }
  | { kind: "consistent"; samples: number; cv: number; mean: number; population: number; target: number; cutoff: number; qualified: number };
