import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import {
  getSession,
  signInWithAdminCode,
  signOut as performSignOut,
  verifyAdmin,
} from "@/services/adminService";

interface AdminContextValue {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (code: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const activeSession = await getSession();
      setSession(activeSession);
      setIsAdmin(activeSession ? await verifyAdmin() : false);
    } catch (authError) {
      setError(getErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
    const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setIsAdmin(false);
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, [hydrate]);

  const signIn = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const nextSession = await signInWithAdminCode(code);
      setSession(nextSession);
      setIsAdmin(true);
      setError(null);
      return true;
    } catch (authError) {
      setError(getErrorMessage(authError));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await performSignOut();
    setSession(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(
    () => ({ session, isAdmin, loading, error, signIn, signOut }),
    [session, isAdmin, loading, error, signIn, signOut],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// The provider and its matching hook intentionally share one module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin muss innerhalb des AdminProvider verwendet werden.");
  return context;
}
