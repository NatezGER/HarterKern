export interface RivalryHubPairV2 {
  playerAId: string;
  playerBId: string;
  playerADisplayName: string;
  playerBDisplayName: string;
  playerAAvatarUrl: string | null;
  playerBAvatarUrl: string | null;
  comparableH2hEvents: number;
  h2hWinsA: number;
  h2hWinsB: number;
  ties: number;
  totalDirectTakeovers: number;
  eventsWithTakeover: number;
  canonicalCommonEvents: number;
  canonicalDirectTakeovers: number;
  rivalryDirectTakeovers: number;
  rivalryLength: number;
  rivalryEvents: number;
  rivalryScore: number;
  intensityPercent: number | null;
  firstRivalryEventDateScope: string | null;
  lastRivalryEventDateScope: string | null;
  rivalryStatusAllTime: boolean;
  firstRivalryEventDateAllTime: string | null;
  rivalryLengthAllTime: number;
  formalRivalryInScope: boolean;
  historicalRivalry: boolean;
  duelOnly: boolean;
}
export interface RivalryHubV2 {
  season: import("@/lib/season").SeasonSelection;
  summary: { rivalryEvents: number; playersWithRivalry: number; directTakeovers: number };
  pairs: RivalryHubPairV2[];
}
