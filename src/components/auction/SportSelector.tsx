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
      <h2 className="font-display text-4xl font-extrabold uppercase sm:text-6xl">Which auction are we running?</h2>
      <p className="mt-2 text-muted">Each sport has its own wheel, purses and squads.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
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
              className="card-link group relative flex flex-col overflow-hidden text-left disabled:opacity-50"
            >
              <div className="bg-banner relative flex h-32 w-full items-end overflow-hidden p-5">
                <span aria-hidden className="absolute -right-3 -top-3 text-[5.5rem] leading-none drop-shadow-xl transition duration-300 group-hover:rotate-6 group-hover:scale-105 lg:-top-4 lg:text-[7rem]">
                  {config.emoji}
                </span>
                <span className="relative z-10 font-display text-3xl font-extrabold uppercase leading-none text-white lg:text-4xl">{sport.name}</span>
              </div>
              <dl className="grid w-full grid-cols-3 gap-2 p-5">
                {[
                  ["On wheel", count("available")],
                  ["Sold", count("sold")],
                  ["Unsold", count("unsold")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
                    <dd className="font-display text-3xl font-bold leading-tight">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-auto w-full border-t border-border px-5 py-3 text-xs font-semibold text-muted">Squads of {sport.squad_size}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
