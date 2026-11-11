import type { BeerBrandRanking } from "@/services/playerBeerService";
export const beerRankingModes = {
  fastest: { label: "Schnellstes Bier", title: "Meine schnellsten Biere", field: "bestHundredths", descending: false },
  slowest: { label: "Langsamstes Bier", title: "Meine langsamsten Biere", field: "worstHundredths", descending: true },
  bestAverage: { label: "Bester Durchschnitt", title: "Meine besten Bierdurchschnitte", field: "averageHundredths", descending: false },
  worstAverage: { label: "Schlechtester Durchschnitt", title: "Meine schlechtesten Bierdurchschnitte", field: "averageHundredths", descending: true },
  most: { label: "Meistgetrunken", title: "Meine meistgetrunkenen Biere", field: "attempts", descending: true },
} as const;
export type BeerRankingMode = keyof typeof beerRankingModes;
export function rankPlayerBeers(brands: BeerBrandRanking[], mode: BeerRankingMode) {
  const { field, descending } = beerRankingModes[mode];
  return [...brands].sort((a, b) => (a[field] - b[field]) * (descending ? -1 : 1)
    || (a.brand < b.brand ? -1 : a.brand > b.brand ? 1 : 0));
}
