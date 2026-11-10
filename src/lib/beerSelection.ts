import type { LiveAttempt } from "@/types/liveEvent";
export const normalizeBeerBrand = (value?: string | null) => value?.trim() || null;
export function eventBeerOptions(eventId: string, standard: string | null | undefined, attempts: LiveAttempt[]) {
  return [...new Set([normalizeBeerBrand(standard), ...attempts.filter(a => a.eventId === eventId).map(a => normalizeBeerBrand(a.beerBrand))].filter((b): b is string => b !== null))];
}
