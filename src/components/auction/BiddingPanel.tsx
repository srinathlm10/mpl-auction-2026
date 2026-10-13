"use client";

import { Kbd } from "@/components/ui/Kbd";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { checkTeamBid, nextBidAmount } from "@/lib/auction";
import { cn, formatCompact, formatPrice } from "@/lib/format";
import type { AuctionSettings, AuctionState, Bid, Team } from "@/lib/types";

interface Props {
  /** "admin" shows the bid buttons; "display" is view only. */
  mode: "admin" | "display";
  state: AuctionState;
  settings: AuctionSettings;
  squadSize: number;
  teams: Team[];
  boughtCount: (teamId: number) => number;
  bids: Bid[];
  busy: boolean;
  onBid?: (teamId: number, expectedAmount: number) => void;
  onUndo?: () => void;
  onSold?: () => void;
  onUnsold?: () => void;
  /** Show a bid button per team here (off when the teams have their own corner cards). */
  teamButtons?: boolean;
}

export function BiddingPanel({
  mode,
  state,
  settings,
  squadSize,
  teams,
  boughtCount,
  bids,
  busy,
  onBid,
  onUndo,
  onSold,
  onUnsold,
  teamButtons = true,
}: Props) {
  const current = state.current_bid ?? settings.base_price;
  const holder = teams.find((t) => t.id === state.highest_team_id);
  const nextAmount = nextBidAmount(current, settings.increment_slabs);
  const teamName = (id: number) => teams.find((t) => t.id === id)?.name ?? "Team";

  return (
    <div className="space-y-4 2xl:space-y-6">
      {/* Current bid */}
      <div className="card relative overflow-hidden border-accent/60 p-5 text-center 2xl:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <p className="relative text-sm font-bold uppercase tracking-[0.25em] text-muted 2xl:text-xl">Current bid</p>
        <p
          key={current}
          className="relative animate-[pop_0.35s_ease-out] font-display text-[clamp(4rem,11vw,10rem)] font-extrabold leading-none"
        >
          {formatCompact(current)}
        </p>
        <p className="relative text-muted 2xl:text-xl">{formatPrice(current)}</p>

        <div className="relative mt-4 flex items-center justify-center gap-3">
          {holder ? (
            <>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-border 2xl:h-16 2xl:w-16">
                <PlayerAvatar name={holder.name} src={holder.logo_url} sizes="64px" className="text-lg" />
              </div>
              <p className="font-display text-3xl font-bold uppercase text-accent 2xl:text-5xl">{holder.name}</p>
            </>
          ) : (
            <p className="text-lg text-muted 2xl:text-2xl">No bids yet – opening at base price</p>
          )}
        </div>
      </div>

      {/* Team bid buttons (admin only) */}
      {mode === "admin" && teamButtons && (
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => {
            const check = checkTeamBid({
              team,
              bought: boughtCount(team.id),
              squadSize,
              amount: nextAmount,
              basePrice: settings.base_price,
              isHighest: team.id === state.highest_team_id,
            });
            const isHolder = team.id === state.highest_team_id;
            return (
              <div key={team.id}>
                <button
                  type="button"
                  disabled={busy || !check.ok}
                  onClick={() => onBid?.(team.id, nextAmount)}
                  className={cn(
                    "flex min-h-[5.5rem] w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition",
                    isHolder
                      ? "border-accent bg-accent/20"
                      : check.ok
                        ? "border-primary/50 bg-surface hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10"
                        : "cursor-not-allowed border-border bg-surface opacity-50",
                  )}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-border">
                    <PlayerAvatar name={team.name} src={team.logo_url} sizes="56px" className="text-xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-2xl font-bold uppercase leading-tight">{team.name}</p>
                    <p className="text-sm text-muted">
                      Purse {formatCompact(team.remaining_purse)} · {boughtCount(team.id)}/{squadSize} players
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Bid</p>
                    <p className="font-display text-2xl font-extrabold">{formatCompact(nextAmount)}</p>
                  </div>
                </button>
                {!check.ok && !isHolder && (
                  <p role="status" className="mt-1 px-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {check.reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Controls (admin only) */}
      {mode === "admin" && (
        <div className="grid grid-cols-3 gap-3">
          <button type="button" disabled={busy || bids.length === 0} onClick={onUndo} className="btn-outline min-h-[56px] text-base">
            ↶ Undo last bid <Kbd>U</Kbd>
          </button>
          <button
            type="button"
            disabled={busy || !holder}
            onClick={onSold}
            className="btn min-h-[56px] bg-emerald-600 text-lg text-white hover:bg-emerald-500"
          >
            ✔ Sold <Kbd>S</Kbd>
          </button>
          <button
            type="button"
            disabled={busy || bids.length > 0}
            onClick={onUnsold}
            className="btn-danger min-h-[56px] text-base"
            title={bids.length > 0 ? "Undo the bids first, or sell the player" : "Nobody bid – remove from the wheel"}
          >
            ✕ Unsold <Kbd>N</Kbd>
          </button>
        </div>
      )}

      {/* Bid history */}
      <div className="card p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted 2xl:text-base">Bid history</h3>
        {bids.length === 0 ? (
          <p className="text-sm text-muted 2xl:text-lg">No bids yet.</p>
        ) : (
          <ol className="max-h-48 divide-y divide-border overflow-y-auto">
            {bids.map((bid, i) => (
              <li key={bid.id} className={cn("flex items-center justify-between gap-3 py-1.5 2xl:py-2.5", i === 0 && "font-bold")}>
                <span className="truncate 2xl:text-2xl">{teamName(bid.team_id)}</span>
                <span className="shrink-0 font-display text-xl 2xl:text-3xl">{formatCompact(bid.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
