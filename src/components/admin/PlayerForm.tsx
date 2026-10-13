"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import { ImageField } from "@/components/admin/ImageField";
import { statusLabel } from "@/components/ui/StatusBadge";
import { getSportConfig } from "@/lib/sports";
import { PLAYER_STATUSES, type Player, type PlayerStatus, type Sport, type Team } from "@/lib/types";

interface Props {
  /** Server action already bound to the player id (or null when creating). */
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  sports: Sport[];
  teams: Team[];
  player?: Player;
}

export function PlayerForm({ action, sports, teams, player }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [sportId, setSportId] = useState(String(player?.sport_id ?? sports[0]?.id ?? ""));
  const [status, setStatus] = useState<PlayerStatus>(player?.status ?? "available");
  const [name, setName] = useState(player?.name ?? "");

  const sport = sports.find((s) => String(s.id) === sportId);
  const config = getSportConfig(sport?.slug ?? "", sport?.name);
  const sportTeams = teams.filter((t) => String(t.sport_id) === sportId);

  // Keep a stored role selectable even if it is no longer in the config list.
  const currentRole = player?.sport_id === sport?.id ? player?.role_or_position : undefined;
  const roles = currentRole && !config.roles.includes(currentRole) ? [currentRole, ...config.roles] : config.roles;

  return (
    <form action={formAction} className="card space-y-6 p-4 sm:p-6">
      {state?.error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">Full name *</label>
          <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="sport_id" className="label">Sport *</label>
          <select id="sport_id" name="sport_id" value={sportId} onChange={(e) => setSportId(e.target.value)} className="input">
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="batch" className="label">Batch</label>
          <input id="batch" name="batch" placeholder="e.g. 2025-27" defaultValue={player?.batch} className="input" />
        </div>
        <div>
          <label htmlFor="role_or_position" className="label">{config.roleLabel}</label>
          {roles.length > 0 ? (
            <select id="role_or_position" name="role_or_position" defaultValue={currentRole ?? ""} key={sportId} className="input">
              <option value="">— Select —</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ) : (
            <input id="role_or_position" name="role_or_position" defaultValue={currentRole} key={sportId} className="input" />
          )}
        </div>
        <div>
          <label htmlFor="base_price" className="label">Base price *</label>
          <input
            id="base_price"
            name="base_price"
            type="number"
            min={0}
            step={1000}
            required
            inputMode="numeric"
            defaultValue={player?.base_price ?? config.defaultBasePrice}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value as PlayerStatus)} className="input">
            {PLAYER_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {status === "sold" && (
        <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="team_id" className="label">Bought by *</label>
            <select id="team_id" name="team_id" defaultValue={player?.team_id ?? ""} required className="input">
              <option value="">— Select team —</option>
              {sportTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sold_price" className="label">Sold price *</label>
            <input
              id="sold_price"
              name="sold_price"
              type="number"
              min={0}
              required
              inputMode="numeric"
              defaultValue={player?.sold_price ?? ""}
              className="input"
            />
          </div>
        </div>
      )}

      {config.skills.length > 0 && (
        <fieldset key={sportId} className="rounded-xl border border-border p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">Skill ratings (1–10)</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {config.skills.map((skill) => (
              <div key={skill.key}>
                <label htmlFor={`skill_${skill.key}`} className="label">{skill.label}</label>
                <input
                  id={`skill_${skill.key}`}
                  name={`skill_${skill.key}`}
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  inputMode="decimal"
                  defaultValue={player?.skills?.[skill.key]}
                  className="input"
                />
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <ImageField name="photo" label="Photo" currentUrl={player?.photo_url} fallbackName={name} />

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : player ? "Save changes" : "Add player"}
        </button>
        <Link href="/admin/players" className="btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
