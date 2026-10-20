import type { SeasonSelection } from "@/lib/season";
export interface BeerFavorite {
  playerId: string; name: string; brand: string; attempts: number;
  averageHundredths: number; bestHundredths: number; overallAverageHundredths: number;
  overallAttempts: number; effectHundredths: number;
}
export interface BeerBrandStatistic {
  imagePath: string | null;
  players: BeerFavorite[];
  eventDetails: { eventId: string; name: string; date: string; attempts: number }[];
  brand: string; attempts: number; events: number; people: number;
  performanceAttempts: number; averageHundredths: number | null; bestHundredths: number | null;
  qualified: boolean; performancePosition: number | null;
  mostDrinker: { personKey: string; playerId: string | null; name: string; isGuest: boolean; isAk: boolean; attempts: number };
  bestPlayer: { playerId: string; name: string; attempts: number; averageHundredths: number; bestHundredths: number } | null;
}
export interface BeerStatistics {
  season: SeasonSelection;
  summary: { attempts: number; brands: number; events: number; people: number; bestBeer: string | null };
  brands: BeerBrandStatistic[];
  fastest: { attemptId: string; playerId: string; name: string; brand: string; timeHundredths: number;
    eventId: string; eventName: string; eventDate: string }[];
  unlucky: BeerFavorite[];
  favorites: BeerFavorite[];
  effects: BeerFavorite[];
  variety: { playerId: string; name: string; brands: number; attempts: number }[];
}
