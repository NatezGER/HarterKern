export const TROPHY_COMPETITIONS = [
  {
    key: "season",
    name: "Saison",
    editions: [{ year: 2026, tiers: ["gold", "silver", "bronze"] }],
  },
  {
    key: "denmark",
    name: "Dänemark",
    editions: [{ year: 2026, tiers: ["gold", "silver", "bronze"] }],
  },
] as const;

export type TrophyCompetitionKey = (typeof TROPHY_COMPETITIONS)[number]["key"];
export type TrophySlotTier = "gold" | "silver" | "bronze";

export const HISTORICAL_TROPHY_ASSET_IDS = [
  "trophy:historical:first-sub-3",
  "trophy:historical:first-sub-2",
  "trophy:historical:first-bingo-card",
] as const;

export function trophySlotAssetId(
  competitionKey: TrophyCompetitionKey,
  year: number,
  tier: TrophySlotTier,
) {
  return `trophy:${competitionKey}:${year}:${tier}`;
}

export const TROPHY_SLOT_ASSET_IDS = TROPHY_COMPETITIONS.flatMap((competition) =>
  competition.editions.flatMap((edition) => edition.tiers.map((tier) =>
    trophySlotAssetId(competition.key, edition.year, tier),
  )),
);

export const TROPHY_ASSET_IDS = [
  ...TROPHY_SLOT_ASSET_IDS,
  ...HISTORICAL_TROPHY_ASSET_IDS,
] as const;

export function isTrophySlotAssetId(value: string) {
  return (TROPHY_ASSET_IDS as readonly string[]).includes(value);
}
