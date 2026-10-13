"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { cn, formatCompact, formatPrice } from "@/lib/format";
import type { Player, Team } from "@/lib/types";

interface Props {
  teams: Team[];
  players: Player[];
  squadSize: number;
  /** Team currently holding the highest bid (highlighted). */
  highlightTeamId: number | null;
}

/** Always-visible row of team cards. Tapping one opens its squad. */
export function TeamStrip({ teams, players, squadSize, highlightTeamId }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const squadOf = (teamId: number) => players.filter((p) => p.team_id === teamId && p.status === "sold");
  const open = teams.find((t) => t.id === openId);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:gap-5">
        {teams.map((team) => {
          const bought = squadOf(team.id).length;
          const spentPct = team.total_purse > 0 ? ((team.total_purse - team.remaining_purse) / team.total_purse) * 100 : 0;
          return (
            <li key={team.id}>
              <button
                type="button"
                onClick={() => setOpenId(team.id)}
                aria-label={`${team.name} squad`}
                className={cn(
                  "card w-full p-3 text-left transition hover:-translate-y-0.5 hover:border-accent 2xl:p-5",
                  team.id === highlightTeamId && "border-accent ring-2 ring-accent",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-border 2xl:h-16 2xl:w-16">
                    <PlayerAvatar fit="contain" name={team.name} src={team.logo_url} sizes="64px" className="text-lg" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl font-bold uppercase leading-tight 2xl:text-3xl">{team.name}</p>
                    <p className="text-xs text-muted 2xl:text-base">
                      Players <span className="font-bold text-foreground">{bought}/{squadSize}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-muted 2xl:text-base">Purse left</span>
                  <span className="font-display text-2xl font-extrabold 2xl:text-4xl">{formatCompact(team.remaining_purse)}</span>
                </div>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-border 2xl:h-3"
                  role="progressbar"
                  aria-label="Purse remaining"
                  aria-valuenow={Math.round(100 - spentPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${Math.max(0, 100 - spentPct)}%` }} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {open && <SquadDialog team={open} squad={squadOf(open.id)} squadSize={squadSize} onClose={() => setOpenId(null)} />}
    </>
  );
}

export function SquadDialog({ team, squad, squadSize, onClose }: { team: Team; squad: Player[]; squadSize: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const spent = team.total_purse - team.remaining_purse;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${team.name} squad`}
        onClick={(e) => e.stopPropagation()}
        className="card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-3xl font-extrabold uppercase">{team.name}</h3>
            <p className="text-sm text-muted">
              Captain {team.captain || "TBA"} · {squad.length}/{squadSize} players
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-outline min-h-[40px] px-3" aria-label="Close">✕</button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-accent/15 p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Spent</dt>
            <dd className="font-display text-2xl font-bold">{formatCompact(spent)}</dd>
          </div>
          <div className="rounded-xl bg-accent/15 p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Remaining</dt>
            <dd className="font-display text-2xl font-bold">{formatCompact(team.remaining_purse)}</dd>
          </div>
        </dl>

        {squad.length === 0 ? (
          <p className="mt-4 text-muted">No players bought yet.</p>
        ) : (
          <ol className="mt-4 divide-y divide-border">
            {squad.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{i + 1}. {p.name}</span>
                  <span className="block truncate text-xs text-muted">{p.role_or_position}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatPrice(p.sold_price)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
