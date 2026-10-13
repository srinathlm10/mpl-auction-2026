"use client";

import { accentStyle, getSportConfig } from "@/lib/sports";
import type { Player, Sport } from "@/lib/types";

interface Props {
  sports: Sport[];
  players: Player[];
  disabled?: boolean;
  onSelect: (sportId: number) => void;
}

/** Shown at the start (and via "Change sport"): pick which sport's auction to run. */
export function SportSelector({ sports, players, disabled, onSelect }: Props) {
  return (
    <div className="mx-auto max-w-4xl py-6 text-center">
      <h2 className="font-display text-4xl font-extrabold uppercase tracking-wide sm:text-5xl">Which auction are we running?</h2>
      <p className="mt-2 text-muted">Each sport has its own wheel, purses and squads.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {sports.map((sport) => {
          const config = getSportConfig(sport.slug, sport.name);
          const list = players.filter((p) => p.sport_id === sport.id);
          const count = (s: Player["status"]) => list.filter((p) => p.status === s).length;
          return (
            <button
              key={sport.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(sport.id)}
              style={accentStyle(config)}
              className="card group relative overflow-hidden p-6 transition hover:-translate-y-1 hover:border-accent disabled:opacity-50"
            >
              <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/25 blur-2xl transition group-hover:bg-accent/40" />
              <span className="relative text-6xl" aria-hidden>{config.emoji}</span>
              <p className="relative mt-3 font-display text-4xl font-extrabold uppercase">{sport.name}</p>
              <p className="relative mt-2 text-sm text-muted">
                {count("available")} on the wheel · {count("sold")} sold · {count("unsold")} unsold
              </p>
              <p className="relative mt-1 text-xs text-muted">Squad size {sport.squad_size}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
