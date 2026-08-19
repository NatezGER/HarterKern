import { getSupabase } from "@/lib/supabase";
import type { BadgeAssetDefinition } from "@/lib/awardAssets";

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
    .select("badge_key,family_key,name,tier,design_variant,sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    badgeKey: row.badge_key,
    familyKey: row.family_key,
    name: row.name,
    tier: row.tier,
    designVariant: row.design_variant,
    sortOrder: row.sort_order,
  }));
}
