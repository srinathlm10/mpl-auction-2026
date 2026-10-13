export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase now calls this the "publishable" key (sb_publishable_...); older projects call it the "anon" key.
// Either variable name works. (Each is written out in full so Next.js can inline it in the browser bundle.)
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * When the Supabase variables are empty the site runs on the built-in player
 * list (read-only) and the auction screens show a setup notice.
 */
export const isSupabaseConfigured = supabaseUrl.startsWith("http") && supabaseAnonKey.length > 0;

export const MEDIA_BUCKET = "mpl-media";
