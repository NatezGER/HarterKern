import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { resolveAwardAsset } from "@/lib/awardAssets";
import { getAwardAssetMapping } from "@/services/awardAssetService";

interface AwardAssetContextValue {
  mapping: Record<string, string>;
  refresh: () => Promise<void>;
}

const emptyValue: AwardAssetContextValue = {
  mapping: {},
  refresh: async () => undefined,
};
const AwardAssetContext = createContext<AwardAssetContextValue>(emptyValue);

export function AwardAssetProvider({ children }: { children: ReactNode }) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setMapping(await getAwardAssetMapping());
  }, []);

  useEffect(() => { void refresh().catch(() => setMapping({})); }, [refresh]);
  const value = useMemo(() => ({ mapping, refresh }), [mapping, refresh]);
  return <AwardAssetContext.Provider value={value}>{children}</AwardAssetContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAwardAssets() {
  return useContext(AwardAssetContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAwardAssetUrl(assetId: string) {
  return resolveAwardAsset(useAwardAssets().mapping, assetId);
}
