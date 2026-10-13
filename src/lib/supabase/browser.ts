import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./env";

let client: SupabaseClient | null = null;

/**
 * Browser client used by the live auction screens: it reads the signed-in
 * admin's session cookie (so RPC calls act as that admin) and listens to
 * Realtime changes. On the public display it simply runs anonymously.
 */
export function getBrowserClient(): SupabaseClient {
  if (!client) client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
