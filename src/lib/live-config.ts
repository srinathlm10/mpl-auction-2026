/*
 * Live scores need a small shared database (Supabase), because every visitor has to see
 * the same score. Everything else on the site works without it.
 *
 * Set these two variables (Netlify -> Site configuration -> Environment variables, or .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   (the "publishable" key; older projects call it "anon")
 * The publishable key is meant to be public. NEVER put the secret / service-role key here.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Each name is written out in full so Next.js can inline it into the browser code.
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** False when the variables are missing: the live pages then say so, and the menu link is hidden. */
export const liveConfigured = supabaseUrl.startsWith("http") && supabaseKey.length > 0;
