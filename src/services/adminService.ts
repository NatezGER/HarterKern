import type { Session } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { ConfigurationError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";

export async function signInWithAdminCode(code: string) {
  if (!env.adminEmail) throw new ConfigurationError();
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: env.adminEmail,
    password: code,
  });
  if (error) throw error;
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    await signOut();
    throw new Error("Dieser Benutzer besitzt keine Admin-Rolle.");
  }
  return data.session;
}

export async function verifyAdmin() {
  const { data, error } = await getSupabase().rpc("is_admin");
  if (error) throw error;
  return data;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}
