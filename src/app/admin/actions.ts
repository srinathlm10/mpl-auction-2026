"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateSlabs } from "@/lib/auction";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { BidSlab } from "@/lib/types";

export type FormState = { error?: string; saved?: boolean } | undefined;

/* --------------------------------------------------------------------- auth */

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "Supabase is not configured." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/admin/auction");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}

/* ----------------------------------------------------------------- settings */

interface SettingsPayload {
  basePrice: number;
  slabs: BidSlab[];
  squads: Record<string, number>;
}

/** Saves base price, bid increment slabs and squad size per sport. */
export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "Supabase is not configured." };
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  let payload: SettingsPayload;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "The form data could not be read. Please reload the page." };
  }

  const { basePrice, slabs, squads } = payload;
  if (!Number.isInteger(basePrice) || basePrice <= 0) return { error: "Base price must be a positive whole number." };
  const slabError = validateSlabs(slabs);
  if (slabError) return { error: slabError };
  for (const [id, size] of Object.entries(squads)) {
    if (!Number.isInteger(size) || size < 1 || size > 50) return { error: `Squad size (sport ${id}) must be a whole number from 1 to 50.` };
  }

  const settings = await supabase.from("auction_settings").update({ base_price: basePrice, increment_slabs: slabs }).eq("id", 1);
  if (settings.error) return { error: settings.error.message };

  for (const [id, size] of Object.entries(squads)) {
    const res = await supabase.from("sports").update({ squad_size: size }).eq("id", Number(id));
    if (res.error) return { error: res.error.message };
  }

  // The new base price applies to every player who has not been sold yet.
  const players = await supabase.from("players").update({ base_price: basePrice }).neq("status", "sold");
  if (players.error) return { error: players.error.message };

  revalidatePath("/", "layout");
  return { saved: true };
}
