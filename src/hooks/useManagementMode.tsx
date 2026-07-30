import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  clearManagementCode,
  getStoredManagementToken,
  verifyManagementCode,
} from "@/services/adminMediaService";

interface ManagementContextValue {
  unlocked: boolean;
  unlock: (code: string) => Promise<boolean>;
  lock: () => void;
}

const ManagementContext = createContext<ManagementContextValue | null>(null);
export function ManagementModeProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => Boolean(getStoredManagementToken()));
  const unlock = useCallback(async (code: string) => {
    const valid = await verifyManagementCode(code);
    if (valid) {
      setUnlocked(true);
    }
    return valid;
  }, []);
  const lock = useCallback(() => {
    clearManagementCode();
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
