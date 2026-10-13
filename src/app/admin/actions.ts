"use server";

import { revalidatePath } from "next/cache";
import { validateSlabs } from "@/lib/auction";
import { createPublicClient } from "@/lib/supabase/public";
import type { BidSlab } from "@/lib/types";

export type FormState = { error?: string; saved?: boolean } | undefined;

interface SettingsPayload {
  basePrice: number;
  slabs: BidSlab[];
  squads: Record<string, number>;
}

/** Saves base price, bid increment slabs and squad size per sport. */
export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = createPublicClient();
  if (!supabase) return { error: "Supabase is not configured." };

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

  // One database action: settings, squad sizes, and the new base price for every unsold player.
  const { error } = await supabase.rpc("auction_save_settings", {
    p_base_price: basePrice,
    p_slabs: slabs,
    p_squads: squads,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { saved: true };
}
