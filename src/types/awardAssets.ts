import type { BadgeTier } from "@/types/pr7Foundation";

export type AwardAssetsTable = {
  Row: {
    asset_id: string;
    asset_type: "medal" | "badge" | "trophy";
    storage_path: string;
    mime_type: "image/png" | "image/webp";
    size_bytes: number;
    width: number;
    height: number;
    created_at: string;
    updated_at: string;
  };
  Insert: never;
  Update: never;
  Relationships: [];
};

export interface PublicBadgeAssetDefinition {
  badge_key: string;
  family_key: string | null;
  name: string;
  tier: BadgeTier;
  sort_order: number;
  is_active: boolean;
}
