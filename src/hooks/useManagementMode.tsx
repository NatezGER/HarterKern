import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

interface ManagementContextValue {
  unlocked: boolean;
  unlock: (code: string) => boolean;
  lock: () => void;
}

const ManagementContext = createContext<ManagementContextValue | null>(null);
const storageKey = "harter-kern-management-unlocked";

export function ManagementModeProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() =>
    typeof sessionStorage !== "undefined" && sessionStorage.getItem(storageKey) === "true",
  );
  const unlock = useCallback((code: string) => {
    const valid = code.trim() === env.managementCode;
    if (valid) {
      sessionStorage.setItem(storageKey, "true");
      setUnlocked(true);
    }
    return valid;
  }, []);
  const lock = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setUnlocked(false);
  }, []);
  const value = useMemo(() => ({ unlocked, unlock, lock }), [lock, unlock, unlocked]);
  return <ManagementContext.Provider value={value}>{children}</ManagementContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useManagementMode() {
  const context = useContext(ManagementContext);
  if (!context) throw new Error("useManagementMode muss innerhalb des Providers verwendet werden.");
  return context;
}
