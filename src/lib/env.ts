export interface PublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  adminEmail: string;
}

export const env: PublicEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "",
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL?.trim() ?? "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
