"use client";

import { Kbd } from "@/components/ui/Kbd";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import type { BidCheck } from "@/lib/auction";
import { cn, formatCompact } from "@/lib/format";
import type { Team } from "@/lib/types";

interface Props {
  team: Team;
  bought: number;
  squadSize: number;
  /** This team holds the highest bid right now. */
  isHolder: boolean;
  /** Show the bid button (control screen while bidding is open). */
  canBid: boolean;
  nextAmount: number;
  check: BidCheck;
  busy: boolean;
  onBid: () => void;
  onOpenSquad: () => void;
  /** Keyboard key that places this team's bid, shown on the button. */
  shortcut?: string;
}

/** One of the four team cards in the corners of the auction screen. */
export function TeamCorner({ team, bought, squadSize, isHolder, canBid, nextAmount, check, busy, onBid, onOpenSquad, shortcut }: Props) {
  const spentPct = team.total_purse > 0 ? ((team.total_purse - team.remaining_purse) / team.total_purse) * 100 : 0;

  return (
    <div
      className={cn(
        "card relative flex flex-col gap-3 p-4 transition 2xl:gap-4 2xl:p-6",
        isHolder && "border-accent ring-4 ring-accent/60",
      )}
    >
      {isHolder && (
        <span className="absolute -top-3 right-3 rounded-full bg-accent px-3 py-0.5 text-xs font-extrabold uppercase tracking-wide text-slate-900 2xl:text-sm">
          Highest bid
        </span>
      )}

      <button type="button" onClick={onOpenSquad} className="flex items-center gap-3 text-left" aria-label={`${team.name} squad`}>
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-border 2xl:h-20 2xl:w-20">
          <PlayerAvatar name={team.name} src={team.logo_url} sizes="80px" className="text-xl" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl font-extrabold uppercase leading-tight 2xl:text-4xl">{team.name}</p>
          {team.captain && <p className="truncate text-xs text-muted 2xl:text-base">Captain {team.captain}</p>}
        </div>
      </button>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted 2xl:text-base">Purse left</span>
          <span className="font-display text-3xl font-extrabold 2xl:text-5xl">{formatCompact(team.remaining_purse)}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-border 2xl:h-3" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${Math.max(0, 100 - spentPct)}%` }} />
        </div>
        <p className="mt-1.5 text-sm text-muted 2xl:text-lg">
          Players <span className="font-bold text-foreground">{bought}/{squadSize}</span>
        </p>
      </div>

      {canBid && (
        <div>
          <button
            type="button"
            disabled={busy || !check.ok}
            onClick={onBid}
            className={cn(
              "btn min-h-[56px] w-full font-display text-2xl font-extrabold uppercase tracking-wide 2xl:min-h-[72px] 2xl:text-3xl",
              check.ok ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border bg-surface text-muted",
            )}
          >
            Bid {formatCompact(nextAmount)}
            {shortcut && <Kbd>{shortcut}</Kbd>}
          </button>
          {!check.ok && !isHolder && (
            <p role="status" className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400 2xl:text-sm">
              {check.reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
