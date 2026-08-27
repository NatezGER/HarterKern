import { compareBadgeDisplayOrder } from "@/lib/badgePresentation";
import { getSupabase } from "@/lib/supabase";
import type { BadgeTier } from "@/types/pr7Foundation";

export interface AdminBadgeDefinition {
  badgeKey: string;
  familyKey: string | null;
  category: string;
  tier: BadgeTier;
  name: string;
  description: string;
  threshold: number | null;
  requirement: string | null;
  sortOrder: number;
  isSecret: boolean;
  badgeKind: "tiered" | "single";
  designVariant: "standard" | "positive_special" | "consolation";
  scopeType: "all_time" | "season" | "event";
  isActive: boolean;
}

export interface AdminBadgeAchievement {
  awardKey: string;
  badgeKey: string;
  playerId: string;
  playerName: string;
  awardedAt: string;
}

export interface AdminBadgeCatalogEntry extends AdminBadgeDefinition {
  achievements: AdminBadgeAchievement[];
}

export function buildAdminBadgeCatalog(
  definitions: AdminBadgeDefinition[],
  achievements: AdminBadgeAchievement[],
): AdminBadgeCatalogEntry[] {
  const achievementsByBadge = new Map<string, AdminBadgeAchievement[]>();
  for (const achievement of achievements) {
    const entries = achievementsByBadge.get(achievement.badgeKey) ?? [];
    entries.push(achievement);
    achievementsByBadge.set(achievement.badgeKey, entries);
  }
  return definitions.map((definition, index) => ({
    definition,
    index,
    achievements: (achievementsByBadge.get(definition.badgeKey) ?? [])
      .sort((left, right) => left.awardedAt.localeCompare(right.awardedAt)),
  })).sort((left, right) => compareBadgeDisplayOrder(left.definition, right.definition) ||
    left.definition.sortOrder - right.definition.sortOrder || left.index - right.index)
    .map(({ definition, achievements: badgeAchievements }) => ({
      ...definition,
      achievements: badgeAchievements,
    }));
}

export async function getAdminBadgeCatalog(): Promise<AdminBadgeCatalogEntry[]> {
  const client = getSupabase();
  const [definitionsResult, achievementsResult] = await Promise.all([
    client.from("badge_definitions").select("badge_key,family_key,category,tier,name,description,threshold,requirement,sort_order,is_secret,badge_kind,design_variant,scope_type,is_active")
      .order("sort_order"),
    client.from("public_player_badges").select("award_key,badge_key,player_id,display_name,awarded_at")
      .order("awarded_at"),
  ]);
  if (definitionsResult.error) throw definitionsResult.error;
  if (achievementsResult.error) throw achievementsResult.error;
  const definitions: AdminBadgeDefinition[] = definitionsResult.data.map((row) => ({
    badgeKey: row.badge_key,
    familyKey: row.family_key,
    category: row.category,
    tier: row.tier,
    name: row.name,
    description: row.description,
    threshold: row.threshold,
    requirement: row.requirement,
    sortOrder: row.sort_order,
    isSecret: row.is_secret,
    badgeKind: row.badge_kind,
    designVariant: row.design_variant,
    scopeType: row.scope_type,
    isActive: row.is_active,
  }));
  const achievements: AdminBadgeAchievement[] = achievementsResult.data.map((row) => ({
    awardKey: row.award_key,
    badgeKey: row.badge_key,
    playerId: row.player_id,
    playerName: row.display_name,
    awardedAt: row.awarded_at,
  }));
  return buildAdminBadgeCatalog(definitions, achievements);
}
