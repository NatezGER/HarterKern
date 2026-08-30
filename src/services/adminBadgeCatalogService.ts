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
  progress?: number | null;
  timeHundredths?: number | null;
}

export interface AdminBadgeCatalogEntry extends AdminBadgeDefinition {
  achievements: AdminBadgeAchievement[];
}

export interface AdminBadgeFamily {
  familyKey: string;
  name: string;
  category: string;
  description: string;
  stages: AdminBadgeCatalogEntry[];
}

export interface AdminBadgeCatalog {
  families: AdminBadgeFamily[];
  singles: AdminBadgeCatalogEntry[];
}

const regularTierOrder: BadgeTier[] = ["bronze", "silver", "gold", "diamond"];

function familyName(entry: AdminBadgeDefinition) {
  const withoutMaterial = entry.name.replace(/\s+(Bronze|Silber|Gold|Diamond)$/i, "").trim();
  if (withoutMaterial && withoutMaterial !== entry.name) return withoutMaterial;
  return (entry.familyKey ?? entry.name).split("-")
    .map((part) => part ? part[0].toLocaleUpperCase("de-DE") + part.slice(1) : part).join(" ");
}

export function buildAdminBadgeCatalog(
  definitions: AdminBadgeDefinition[],
  achievements: AdminBadgeAchievement[],
): AdminBadgeCatalog {
  const achievementsByBadge = new Map<string, AdminBadgeAchievement[]>();
  for (const achievement of achievements) {
    const entries = achievementsByBadge.get(achievement.badgeKey) ?? [];
    entries.push(achievement);
    achievementsByBadge.set(achievement.badgeKey, entries);
  }
  const entries = definitions.filter(({ isActive }) => isActive).map((definition, index) => ({
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
  const entriesByFamily = new Map<string, AdminBadgeCatalogEntry[]>();
  for (const entry of entries) {
    if (!entry.familyKey) continue;
    const familyEntries = entriesByFamily.get(entry.familyKey) ?? [];
    familyEntries.push(entry);
    entriesByFamily.set(entry.familyKey, familyEntries);
  }
  const groupedBadgeKeys = new Set<string>();
  const families = [...entriesByFamily.entries()].flatMap(([familyKey, familyEntries]) => {
    const stages = regularTierOrder.flatMap((tier) => {
      const entry = familyEntries.find((candidate) => candidate.tier === tier &&
        candidate.designVariant === "standard" && candidate.badgeKind === "tiered");
      return entry ? [entry] : [];
    });
    if (stages.length !== regularTierOrder.length) return [];
    for (const stage of stages) groupedBadgeKeys.add(stage.badgeKey);
    const first = stages[0];
    return [{
      familyKey,
      name: familyName(first),
      category: first.category,
      description: first.description,
      stages,
    }];
  }).sort((left, right) => left.stages[0].sortOrder - right.stages[0].sortOrder ||
    left.name.localeCompare(right.name, "de"));
  const singles = entries.filter((entry) => !groupedBadgeKeys.has(entry.badgeKey))
    .sort((left, right) => compareBadgeDisplayOrder(left, right) ||
      left.sortOrder - right.sortOrder);
  return { families, singles };
}

export async function getAdminBadgeCatalog(): Promise<AdminBadgeCatalog> {
  const client = getSupabase();
  const [definitionsResult, achievementsResult] = await Promise.all([
    client.from("badge_definitions").select("badge_key,family_key,category,tier,name,description,threshold,requirement,sort_order,is_secret,badge_kind,design_variant,scope_type,is_active")
      .order("sort_order"),
    client.from("player_badge_award_achievements").select("award_key,badge_key,player_id,display_name,awarded_at,metadata")
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
    progress: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) &&
      "progress" in row.metadata && typeof row.metadata.progress === "number"
      ? row.metadata.progress : null,
    timeHundredths: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) &&
      "timeHundredths" in row.metadata && typeof row.metadata.timeHundredths === "number"
      ? row.metadata.timeHundredths : null,
  }));
  return buildAdminBadgeCatalog(definitions, achievements);
}
