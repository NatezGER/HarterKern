import type { BadgeTier } from "@/types/pr7Foundation";
import type { TrophyTier } from "@/types/pr8";

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
  sortOrder: number;
}

export interface TrophyAssetDefinition {
  competitionType: "event" | "season";
  competitionId: string;
  competitionName: string;
  year: number;
  tier: TrophyTier;
}

export function medalAssetId(rank: MedalRank) {
  return `medal:podium:${medalTierByRank[rank]}`;
}

export function badgeAssetId(badgeKey: string) {
  return `badge:${badgeKey}`;
}

export function trophyAssetId(trophy: Pick<TrophyAssetDefinition,
  "competitionType" | "competitionId" | "year" | "tier">) {
  return `trophy:${trophy.competitionType}:${trophy.competitionId}:${trophy.year}:${trophy.tier}`;
}

export function awardAssetType(assetId: string): AwardAssetType | null {
  const type = assetId.split(":", 1)[0];
  return type === "medal" || type === "badge" || type === "trophy" ? type : null;
}

export function badgeFamilyLabel(definitions: BadgeAssetDefinition[]) {
  return definitions[0]?.name.replace(/\s+(Bronze|Silber|Gold|Diamond|Platinum)$/i, "")
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
