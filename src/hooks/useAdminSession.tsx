import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { env, isSupabaseConfigured } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";

interface AdminSessionValue {
  email: string;
  isAdmin: boolean;
  loading: boolean;
  message: string;
  requestLogin: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const client = getSupabase();
    const { data: sessionData } = await client.auth.getSession();
    const sessionEmail = sessionData.session?.user.email ?? "";
    setEmail(sessionEmail);
    if (!sessionData.session) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const { data, error } = await client.rpc("is_admin");
    setIsAdmin(!error && data === true);
    if (error) setMessage(getErrorMessage(error));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    if (!isSupabaseConfigured) return;
    const { data } = getSupabase().auth.onAuthStateChange(() => void refresh());
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const requestLogin = useCallback(async () => {
    if (!env.adminEmail) {
      setMessage("VITE_ADMIN_EMAIL ist nicht konfiguriert.");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await getSupabase().auth.signInWithOtp({
      email: env.adminEmail,
      options: { emailRedirectTo: `${window.location.origin}/settings` },
    });
    setMessage(error
      ? getErrorMessage(error)
      : `Anmeldelink wurde an ${env.adminEmail} gesendet.`);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await getSupabase().auth.signOut();
    setIsAdmin(false);
    setEmail("");
    setMessage("");
    setLoading(false);
  }, []);

  const value = useMemo(() => ({
    email, isAdmin, loading, message, requestLogin, signOut, refresh,
  }), [email, isAdmin, loading, message, refresh, requestLogin, signOut]);
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession muss innerhalb des Providers verwendet werden.");
  return value;
}
