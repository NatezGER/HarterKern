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
  progress?: AdminBadgeFamilyProgress[];
}

export interface AdminBadgeFamilyProgress { playerId: string; playerName: string; familyKey: string; currentProgress: number; timeHundredths: number | null }

export interface AdminBadgeCatalog {
  families: AdminBadgeFamily[];
  singles: AdminBadgeCatalogEntry[];
  warnings?: string[];
}

export interface AdminBadgeProgressResult {
  progress: AdminBadgeFamilyProgress[];
  warnings: string[];
}

export interface AdminBadgeAchievementsResult {
  achievements: AdminBadgeAchievement[];
  warnings: string[];
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
  progress: AdminBadgeFamilyProgress[] = [],
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
      progress: progress.filter((item) => familyKey === item.familyKey),
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
  const { data, error } = await client.from("badge_definitions")
    .select("badge_key,family_key,category,tier,name,description,threshold,requirement,sort_order,is_secret,badge_kind,design_variant,scope_type,is_active")
    .order("sort_order");
  if (error) throw error;
  const definitions: AdminBadgeDefinition[] = (data ?? []).map((row) => ({
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
  return buildAdminBadgeCatalog(definitions, []);
}

export async function getAdminBadgeAchievements(): Promise<AdminBadgeAchievementsResult> {
  try {
    // The ledger projection already excludes inactive definitions and players.
    // Every recipient is shown in the existing catalog, so no history is lost.
    const { data, error } = await getSupabase().from("player_badge_award_achievements")
      .select("award_key,badge_key,player_id,display_name,awarded_at,metadata")
      .order("awarded_at");
    if (error) throw error;
    const achievements: AdminBadgeAchievement[] = (data ?? []).map((row) => ({
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
    return { achievements, warnings: [] };
  } catch {
    return { achievements: [], warnings: ["Vergaben konnten nicht geladen werden."] };
  }
}

export function withAdminBadgeAchievements(catalog: AdminBadgeCatalog, result: AdminBadgeAchievementsResult): AdminBadgeCatalog {
  const byBadge = new Map<string, AdminBadgeAchievement[]>();
  for (const achievement of result.achievements) {
    const entries = byBadge.get(achievement.badgeKey) ?? [];
    entries.push(achievement);
    byBadge.set(achievement.badgeKey, entries);
  }
  const enrich = (entry: AdminBadgeCatalogEntry): AdminBadgeCatalogEntry => ({
    ...entry, achievements: byBadge.get(entry.badgeKey) ?? [],
  });
  return {
    ...catalog,
    families: catalog.families.map((family) => ({ ...family, stages: family.stages.map(enrich) })),
    singles: catalog.singles.map(enrich),
    warnings: [...(catalog.warnings ?? []), ...result.warnings],
  };
}

export async function getAdminBadgeProgress(): Promise<AdminBadgeProgressResult> {
  const client = getSupabase();
  const [familyResult, rivalryResult] = await Promise.allSettled([
    client.rpc("get_admin_badge_family_progress"),
    client.rpc("get_rivalry_badge_progress"),
  ]);
  const warnings: string[] = [];
  const familyRows = familyResult.status === "fulfilled" && !familyResult.value.error
    ? familyResult.value.data ?? []
    : (warnings.push("Familienfortschritt ist vorübergehend nicht verfügbar."), []);
  const rivalryRows = rivalryResult.status === "fulfilled" && !rivalryResult.value.error
    ? rivalryResult.value.data ?? []
    : (warnings.push("Rivalitätsfortschritt ist vorübergehend nicht verfügbar."), []);
  const progress = [...familyRows, ...rivalryRows].map((row) => ({
    playerId: row.player_id, playerName: row.display_name, familyKey: row.family_key,
    currentProgress: Number(row.current_progress), timeHundredths: row.time_hundredths == null ? null : Number(row.time_hundredths),
  }));
  return { progress, warnings };
}

export function withAdminBadgeProgress(catalog: AdminBadgeCatalog, result: AdminBadgeProgressResult): AdminBadgeCatalog {
  return {
    ...catalog,
    families: catalog.families.map((family) => ({
      ...family,
      progress: result.progress.filter((item) => item.familyKey === family.familyKey),
    })),
    warnings: [...(catalog.warnings ?? []), ...result.warnings],
  };
}
