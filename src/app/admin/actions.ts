"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parsePlayerRows, type CsvRow, type RowError } from "@/lib/csv";
import { isSupabaseConfigured, MEDIA_BUCKET } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Sport } from "@/lib/types";
import { parsePlayerForm, parseTeamForm } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;

/* ------------------------------------------------------------------ helpers */

/** Session client for an authenticated admin; redirects to login otherwise. */
async function adminClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return supabase;
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

async function loadSports(supabase: SupabaseClient): Promise<Sport[]> {
  const { data, error } = await supabase.from("sports").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as Sport[];
}

async function uploadImage(supabase: SupabaseClient, file: File, folder: "players" | "teams"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("The uploaded file must be an image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 5 MB or smaller.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort cleanup of an image we uploaded earlier. */
async function removeImage(supabase: SupabaseClient, url: string | null | undefined) {
  if (!url) return;
  const marker = `/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([url.slice(index + marker.length)]);
}

const uploadedFile = (value: FormDataEntryValue | null): File | null =>
  value instanceof File && value.size > 0 ? value : null;

function refreshSite() {
  revalidatePath("/", "layout");
}

/* --------------------------------------------------------------------- auth */

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "Supabase is not configured." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/admin");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ players */

/** `id` is null when creating. Bind it: `savePlayer.bind(null, id)` for useActionState. */
export async function savePlayer(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await adminClient();

  try {
    const sports = await loadSports(supabase);
    const parsed = parsePlayerForm(formData, sports);
    if (!parsed.ok) return { error: parsed.error };
    const values = parsed.value;

    if (values.team_id !== null) {
      const { data: team } = await supabase.from("teams").select("sport_id").eq("id", values.team_id).maybeSingle();
      if (!team || team.sport_id !== values.sport_id) return { error: "The team must belong to the same sport as the player." };
    }

    const photo = uploadedFile(formData.get("photo"));
    const newPhotoUrl = photo ? await uploadImage(supabase, photo, "players") : undefined;

    if (id === null) {
      const { error } = await supabase.from("players").insert({ ...values, photo_url: newPhotoUrl ?? null });
      if (error) throw new Error(error.message);
    } else {
      let oldPhotoUrl: string | null = null;
      if (newPhotoUrl) {
        const { data } = await supabase.from("players").select("photo_url").eq("id", id).maybeSingle();
        oldPhotoUrl = data?.photo_url ?? null;
      }
      const { error } = await supabase
        .from("players")
        .update({ ...values, ...(newPhotoUrl ? { photo_url: newPhotoUrl } : {}) })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await removeImage(supabase, oldPhotoUrl);
    }
  } catch (e) {
    return { error: messageOf(e) };
  }

  refreshSite();
  redirect("/admin/players");
}

export async function deletePlayer(id: number): Promise<void> {
  const supabase = await adminClient();
  const { data } = await supabase.from("players").select("photo_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await removeImage(supabase, data?.photo_url);
  refreshSite();
}

/* -------------------------------------------------------------------- teams */

export async function saveTeam(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await adminClient();

  try {
    const sports = await loadSports(supabase);
    const parsed = parseTeamForm(formData, sports);
    if (!parsed.ok) return { error: parsed.error };
    const values = parsed.value;

    const logo = uploadedFile(formData.get("logo"));
    const newLogoUrl = logo ? await uploadImage(supabase, logo, "teams") : undefined;

    if (id === null) {
      // remaining_purse is calculated by a database trigger.
      const { error } = await supabase.from("teams").insert({ ...values, logo_url: newLogoUrl ?? null });
      if (error) throw new Error(error.message);
    } else {
      let oldLogoUrl: string | null = null;
      if (newLogoUrl) {
        const { data } = await supabase.from("teams").select("logo_url").eq("id", id).maybeSingle();
        oldLogoUrl = data?.logo_url ?? null;
      }
      const { error } = await supabase
        .from("teams")
        .update({ ...values, ...(newLogoUrl ? { logo_url: newLogoUrl } : {}) })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await removeImage(supabase, oldLogoUrl);
    }
  } catch (e) {
    return { error: messageOf(e) };
  }

  refreshSite();
  redirect("/admin/teams");
}

export async function deleteTeam(id: number): Promise<void> {
  const supabase = await adminClient();
  const { data } = await supabase.from("teams").select("logo_url").eq("id", id).maybeSingle();

  // Players this team bought go back into the pool.
  const released = await supabase
    .from("players")
    .update({ status: "available", team_id: null, sold_price: null })
    .eq("team_id", id);
  if (released.error) throw new Error(released.error.message);

  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await removeImage(supabase, data?.logo_url);
  refreshSite();
}

/* --------------------------------------------------------------- CSV import */

export interface ImportResult {
  inserted: number;
  errors: RowError[];
  fatal?: string;
}

export async function importPlayers(rows: CsvRow[]): Promise<ImportResult> {
  const supabase = await adminClient();
  try {
    if (rows.length === 0) return { inserted: 0, errors: [], fatal: "The file has no data rows." };
    if (rows.length > MAX_IMPORT_ROWS) return { inserted: 0, errors: [], fatal: `Import at most ${MAX_IMPORT_ROWS} rows at a time.` };

    const sports = await loadSports(supabase);
    const { valid, errors } = parsePlayerRows(rows, sports);

    let inserted = 0;
    for (let i = 0; i < valid.length; i += 200) {
      const chunk = valid.slice(i, i + 200).map((p) => ({ ...p, status: "available" }));
      const { error } = await supabase.from("players").insert(chunk);
      if (error) return { inserted, errors, fatal: `Database error after ${inserted} rows: ${error.message}` };
      inserted += chunk.length;
    }

    refreshSite();
    return { inserted, errors };
  } catch (e) {
    return { inserted: 0, errors: [], fatal: messageOf(e) };
  }
}
