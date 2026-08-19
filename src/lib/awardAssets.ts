import type { BadgeTier } from "@/types/pr7Foundation";
import type { TrophyTier } from "@/types/pr8";
import {
  TROPHY_COMPETITIONS,
  trophySlotAssetId,
} from "../../supabase/functions/_shared/trophySlots";
import type { TrophyCompetitionKey } from "../../supabase/functions/_shared/trophySlots";

export type AwardAssetType = "medal" | "badge" | "trophy";
export type MedalRank = 1 | 2 | 3;

const medalTierByRank = {
  1: "gold",
  2: "silver",
  3: "bronze",
} as const;

export interface BadgeAssetDefinition {
  badgeKey: string;
  familyKey: string | null;
  name: string;
  tier: BadgeTier;
  designVariant: "standard" | "positive_special" | "consolation";
  sortOrder: number;
}

export interface TrophyAssetDefinition {
  competitionKey: TrophyCompetitionKey;
  competitionName: string;
  year: number;
  tier: TrophyTier;
}

export const TROPHY_ASSET_DEFINITIONS: TrophyAssetDefinition[] =
  TROPHY_COMPETITIONS.flatMap((competition) => competition.editions.flatMap((edition) =>
    edition.tiers.map((tier) => ({
      competitionKey: competition.key,
      competitionName: competition.name,
      year: edition.year,
      tier,
    })),
  ));

export function medalAssetId(rank: MedalRank) {
  return `medal:podium:${medalTierByRank[rank]}`;
}

export function badgeAssetId(badgeKey: string) {
  return `badge:${badgeKey}`;
}

export function trophyAssetId(trophy: Pick<TrophyAssetDefinition,
  "competitionKey" | "year" | "tier">) {
  return trophySlotAssetId(trophy.competitionKey, trophy.year, trophy.tier);
}

export function trophyAssetIdForAward(trophy: {
  competitionType: "event" | "season" | "historical";
  year: number;
  tier: TrophyTier;
}) {
  return trophy.competitionType === "season"
    ? trophySlotAssetId("season", trophy.year, trophy.tier)
    : null;
}

export function awardAssetType(assetId: string): AwardAssetType | null {
  const type = assetId.split(":", 1)[0];
  return type === "medal" || type === "badge" || type === "trophy" ? type : null;
}

export function badgeFamilyLabel(definitions: BadgeAssetDefinition[]) {
  return definitions[0]?.name.replace(/\s+(Bronze|Silber|Gold|Diamond|Platinum|Smaragd|Holz)$/i, "")
    ?? "Badge";
}

export function groupBadgeDefinitions(definitions: BadgeAssetDefinition[]) {
  const groups = new Map<string, BadgeAssetDefinition[]>();
  for (const definition of [...definitions].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const key = definition.familyKey ?? definition.badgeKey;
    groups.set(key, [...(groups.get(key) ?? []), definition]);
  }
  return [...groups].map(([key, variants]) => ({
    key,
    label: badgeFamilyLabel(variants),
    variants,
  }));
}

export function resolveAwardAsset(
  mapping: Readonly<Record<string, string>>,
  assetId: string,
) {
  return mapping[assetId] || null;
}
