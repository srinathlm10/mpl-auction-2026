"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import { ImageField } from "@/components/admin/ImageField";
import type { Sport, Team } from "@/lib/types";

interface Props {
  /** Server action already bound to the team id (or null when creating). */
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  sports: Sport[];
  team?: Team;
}

export function TeamForm({ action, sports, team }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [name, setName] = useState(team?.name ?? "");

  return (
    <form action={formAction} className="card space-y-6 p-4 sm:p-6">
      {state?.error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">Team name *</label>
          <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="sport_id" className="label">Sport *</label>
          <select id="sport_id" name="sport_id" defaultValue={team?.sport_id ?? sports[0]?.id} className="input">
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="captain" className="label">Captain</label>
          <input id="captain" name="captain" defaultValue={team?.captain} className="input" />
        </div>
        <div>
          <label htmlFor="total_purse" className="label">Total purse *</label>
          <input
            id="total_purse"
            name="total_purse"
            type="number"
            min={0}
            step={1000}
            required
            inputMode="numeric"
            defaultValue={team?.total_purse ?? 1000000}
            className="input"
          />
          {team && <p className="mt-1 text-xs text-muted">Remaining purse is recalculated automatically from sold players.</p>}
        </div>
      </div>

      <ImageField name="logo" label="Team logo" currentUrl={team?.logo_url} fallbackName={name} />

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : team ? "Save changes" : "Add team"}
        </button>
        <Link href="/admin/teams" className="btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
