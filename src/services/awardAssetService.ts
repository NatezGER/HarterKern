import { getSupabase } from "@/lib/supabase";
import type { BadgeAssetDefinition, TrophyAssetDefinition } from "@/lib/awardAssets";

export async function getAwardAssetMapping() {
  const client = getSupabase();
  const { data, error } = await client.from("award_assets")
    .select("asset_id,storage_path");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [
    row.asset_id,
    client.storage.from("award-assets").getPublicUrl(row.storage_path).data.publicUrl,
  ]));
}

export async function getBadgeAssetDefinitions(): Promise<BadgeAssetDefinition[]> {
  const { data, error } = await getSupabase().from("badge_definitions")
    .select("badge_key,family_key,name,tier,sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    badgeKey: row.badge_key,
    familyKey: row.family_key,
    name: row.name,
    tier: row.tier,
    sortOrder: row.sort_order,
  }));
}

export async function getTrophyAssetDefinitions(): Promise<TrophyAssetDefinition[]> {
  const { data, error } = await getSupabase().from("player_trophies")
    .select("competition_type,competition_id,competition_name,competition_year,trophy_tier");
  if (error) throw error;
  const unique = new Map<string, TrophyAssetDefinition>();
  for (const row of data ?? []) {
    const definition: TrophyAssetDefinition = {
      competitionType: row.competition_type,
      competitionId: row.competition_id,
      competitionName: row.competition_name,
      year: row.competition_year,
      tier: row.trophy_tier,
    };
    unique.set(`${definition.competitionType}:${definition.competitionId}:${definition.year}:${definition.tier}`, definition);
  }
  return [...unique.values()];
}
