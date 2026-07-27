import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import {
  emptyPublicData,
  loadPublicData,
} from "@/services/publicDataService";
import type { PublicDataSnapshot } from "@/types";

type DataStatus = "loading" | "ready" | "error" | "unconfigured";

interface PublicDataContextValue {
  data: PublicDataSnapshot;
  status: DataStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

const PublicDataContext = createContext<PublicDataContextValue | null>(null);

export function PublicDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyPublicData);
  const [status, setStatus] = useState<DataStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus("unconfigured");
      return;
    }
    setStatus((current) => current === "ready" ? current : "loading");
    try {
      setData(await loadPublicData());
      setError(null);
      setStatus("ready");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ data, status, error, refresh }),
    [data, status, error, refresh],
  );
  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>;
}

// The provider and its matching hook intentionally share one module.
// eslint-disable-next-line react-refresh/only-export-components
export function usePublicData() {
  const context = useContext(PublicDataContext);
  if (!context) throw new Error("usePublicData muss innerhalb des PublicDataProvider verwendet werden.");
  return context;
}
