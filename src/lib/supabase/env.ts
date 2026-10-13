export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * When the Supabase variables are empty the site runs on the built-in sample
 * data (read-only demo) and the admin area shows a setup notice.
 */
export const isSupabaseConfigured = supabaseUrl.startsWith("http") && supabaseAnonKey.length > 0;

export const MEDIA_BUCKET = "mpl-media";
