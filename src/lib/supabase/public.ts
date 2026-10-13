import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Cookie-less anonymous client for public pages. Because it does not read
 * cookies, pages that use it can be statically cached (ISR) and stay fast.
 * Returns null when Supabase is not configured (sample-data mode).
 */
export function createPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
