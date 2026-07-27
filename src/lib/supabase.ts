import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ConfigurationError } from "@/lib/errors";
import { env, isSupabaseConfigured } from "@/lib/env";

const client = isSupabaseConfigured
  ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabase() {
  if (!client) throw new ConfigurationError();
  return client;
}

export const supabase = client;
