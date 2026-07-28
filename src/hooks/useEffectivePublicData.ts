import { usePublicData } from "@/hooks/usePublicData";

// Kept as a compatibility adapter for existing UI imports.
// Supabase is now the only effective data source; no local overlay is applied.
export function useEffectivePublicData() {
  return usePublicData();
}
